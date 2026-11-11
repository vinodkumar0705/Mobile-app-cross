import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { apiError, apiSuccess } from "../utils/formatter";
import { AdjustmentMode, AdjustmentType, BillItemType, BillStatus, BillType, PaymentFlowType, PaymentType, PriceEntityType, Prisma } from "@prisma/client";
import { billType, UpdateBatch, UpdateMedicalItem } from "../types/pharmacy.types";
import { deletePrices, getActivePrice, getActivePriceAmount, upsertPriceRule } from "../utils/pricing.util";
import { addItemToBill } from "../utils/billing.util";

export const PharmacyController = {
    getAllMedicalItems: async (req: Request, res: Response) => {
        try {
            const { searchQuery } = req.query;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const skip = (page - 1) * limit;

            const where: Prisma.MedicalItemWhereInput = {
                isActive: true,
                ...(searchQuery
                    ? {
                          OR: [
                              {
                                  name: {
                                      contains: searchQuery as string,
                                      mode: "insensitive",
                                  },
                              },
                              {
                                  description: {
                                      contains: searchQuery as string,
                                      mode: "insensitive",
                                  },
                              },
                          ],
                      }
                    : {}),
            };
            const [count, items] = await Promise.all([
                await prisma.medicalItem.count({ where }),
                await prisma.medicalItem.findMany({
                    where,
                    skip,
                    take: limit,
                    select: {
                        id: true,
                        name: true,
                        itemType: true,
                        unit: true,
                        strength: true,
                        brand: true,
                        genericName: true,
                        dosageForm: true,
                        isActive: true,
                        hasExpiry: true,
                        batches: {
                            where: { isActive: true },
                            select: {
                                id: true,
                                unitsPerStrip: true,
                                expiryDate: true,
                                quantity: true,
                            },
                        },
                    },
                    orderBy: [
                        {
                            name: "asc",
                        },
                        {
                            batches: {
                                _count: "desc",
                            },
                        },
                    ],
                }),
            ]);

            const response = await Promise.all(
                items.map(async (item) => {
                    const batchesWithPrices = await Promise.all(
                        item.batches.map(async (batch) => {
                            const priceRule = await getActivePrice(PriceEntityType.PHARMACY, batch.id);
                            return {
                                ...batch,
                                sellingPrice: priceRule?.price || 0,
                                mrp: priceRule?.mrp || 0,
                                costPrice: priceRule?.costPrice || 0,
                            };
                        }),
                    );
                    return {
                        id: item.id,
                        name: item.name,
                        itemType: item.itemType,
                        unit: item.unit,
                        strength: item.strength,
                        brand: item.brand,
                        genericName: item.genericName,
                        dosageForm: item.dosageForm,
                        isActive: item.isActive,
                        hasExpiry: item.hasExpiry,
                        totalStock: item.batches.reduce((sum, b) => sum + b.quantity, 0),
                        batches: batchesWithPrices,
                    };
                }),
            );

            return apiSuccess(res, {
                data: response,
                metadata: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit),
                },
            });
        } catch (error) {
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    getMedicalItemById: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const item = await prisma.medicalItem.findUnique({
                where: { id },
                include: {
                    batches: {
                        where: { isActive: true },
                        orderBy: { expiryDate: "asc" },
                    },
                },
            });

            if (!item) {
                return res.status(404).json({ message: "Medical item not found" });
            }

            // Fetch prices for each batch
            const batchesWithPrices = await Promise.all(
                item.batches.map(async (batch) => {
                    const priceRule = await getActivePrice(PriceEntityType.PHARMACY, batch.id);
                    return {
                        ...batch,
                        mrp: priceRule?.mrp || 0,
                        sellingPrice: priceRule?.price || 0,
                        costPrice: priceRule?.costPrice || 0,
                    };
                }),
            );

            return apiSuccess(res, {
                data: { ...item, batches: batchesWithPrices },
            });
        } catch (error) {
            console.error("Pharma fetch error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    getAllStockMovements: async (req: Request, res: Response) => {
        try {
            const movements = await prisma.stockMovement.findMany({
                select: {
                    id: true,
                    movementType: true,
                    quantity: true,
                    reason: true,
                    createdAt: true,
                    batch: {
                        select: {
                            id: true,
                            isActive: true,
                            batchNumber: true,
                            expiryDate: true,
                            quantity: true,
                            unitsPerStrip: true,
                            item: {
                                select: {
                                    id: true,
                                    name: true,
                                    brand: true,
                                    strength: true,
                                    unit: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            });

            // Fetch prices for each batch in movements
            const movementsWithPrices = await Promise.all(
                movements.map(async (m) => {
                    if (!m.batch) return m;
                    const priceRule = await getActivePrice(PriceEntityType.PHARMACY, m.batch.id);
                    return {
                        ...m,
                        batch: {
                            ...m.batch,
                            sellingPrice: priceRule?.price || 0,
                            costPrice: priceRule?.costPrice || 0,
                            mrp: priceRule?.mrp || 0,
                        },
                    };
                }),
            );

            return apiSuccess(res, {
                data: movementsWithPrices,
            });
        } catch (error) {
            console.error("Stock movement fetch error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    updateStock: async (req: Request, res: Response) => {
        try {
            const { bid } = req.query;
            const { reason, quantity, type } = req.body;

            if (!bid) {
                return res.status(400).json({ message: "Batch ID (bid) is required in query params" });
            }

            const action = await prisma.$transaction(async (tx) => {
                const batch = await tx.batch.findUnique({
                    where: { id: bid as string },
                    select: { quantity: true },
                });

                if (!batch) {
                    throw new Error("Batch not found");
                }

                if (type !== "ADD" && batch.quantity < quantity) {
                    throw new Error(`Insufficient stock. Current quantity is ${batch.quantity}`);
                }

                await tx.batch.update({
                    where: { id: bid as string },
                    data: {
                        quantity: {
                            ...(type === "ADD" ? { increment: quantity } : { decrement: quantity }),
                        },
                    },
                });

                return await tx.stockMovement.create({
                    data: {
                        batchId: bid as string,
                        reason,
                        quantity,
                        movementType: type,
                    },
                });
            });

            return apiSuccess(res, {
                data: action,
            });
        } catch (error: any) {
            console.error("Stock update error:", error);
            return apiError(res, {
                message: "Failed to update stock",
            });
        }
    },
    getAllBatches: async (req: Request, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const skip = (page - 1) * limit;

            const where: Prisma.BatchWhereInput = { isActive: true };

            const [count, batches] = await Promise.all([
                prisma.batch.count({ where }),
                prisma.batch.findMany({
                    where,
                    skip,
                    take: limit,
                    include: {
                        item: {
                            select: {
                                id: true,
                                name: true,
                                brand: true,
                                strength: true,
                                unit: true,
                            },
                        },
                    },
                    orderBy: { expiryDate: "asc" },
                }),
            ]);

            const batchesWithPrices = await Promise.all(
                batches.map(async (batch) => {
                    const priceRule = await getActivePrice(PriceEntityType.PHARMACY, batch.id);
                    return {
                        ...batch,
                        sellingPrice: priceRule?.price || 0,
                        costPrice: priceRule?.costPrice || 0,
                        mrp: priceRule?.mrp || 0,
                    };
                }),
            );

            return apiSuccess(res, {
                data: batchesWithPrices,
                metadata: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit),
                },
            });
        } catch (error) {
            console.error("Batch fetch error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    createMedicalItem: async (req: Request, res: Response) => {
        try {
            const item = await prisma.medicalItem.create({
                data: {
                    ...req.body,
                },
            });

            return apiSuccess(res, {
                data: item,
                message: "Medical item added successfully",
            });
        } catch (error) {
            console.error("Add medical item error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    updateMedicalItem: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const body: UpdateMedicalItem = req.body;
            console.log(req.body);

            const item = await prisma.medicalItem.update({
                where: { id },
                data: {
                    ...body,
                },
            });
            return apiSuccess(res, {
                data: item,
                message: "Medical item updated successfully",
            });
        } catch (error) {
            console.error("Update medical item error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    deleteMedicalItem: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const [prescribedItem, templateItem, billedItem, activeBatch] = await Promise.all([
                prisma.prescriptionItem.findFirst({
                    where: {
                        itemId: id,
                    },
                    select: { id: true },
                }),
                prisma.prescriptionTemplateItem.findFirst({
                    where: {
                        itemId: id,
                    },
                    select: { id: true },
                }),
                prisma.billItem.findFirst({
                    where: {
                        referenceType: BillItemType.PHARMACY,
                        referenceId: id,
                    },
                    select: { id: true },
                }),
                prisma.batch.findFirst({
                    where: {
                        itemId: id,
                        isActive: true,
                    },
                    select: { id: true },
                }),
            ]);

            if (prescribedItem) {
                return apiError(res, {
                    message: "Unable to delete medical item as it is already prescribed",
                });
            }
            if (templateItem) {
                return apiError(res, {
                    message: "Unable to delete medical item as it is used in prescription templates",
                });
            }
            if (billedItem) {
                return apiError(res, {
                    message: "Unable to delete medical item as it exists in pharmacy bills",
                });
            }
            if (activeBatch) {
                return apiError(res, {
                    message: "Unable to delete medical item while active stock batches exist",
                });
            }

            const deletedItem = await prisma.$transaction(async (tx) => {
                // Delete prices for all batches of this item
                const batches = await tx.batch.findMany({
                    where: { itemId: id },
                    select: { id: true },
                });

                for (const batch of batches) {
                    await deletePrices(PriceEntityType.PHARMACY, batch.id, tx);
                }

                return await tx.medicalItem.delete({
                    where: { id },
                });
            });

            return apiSuccess(res, {
                data: deletedItem,
                message: "Medical item deleted successfully",
            });
        } catch (error) {
            console.error("Delete medical item error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    createBatch: async (req: Request, res: Response) => {
        try {
            const { sellingPrice, costPrice, mrp, ...batchData } = req.body;

            const existingBatch = await prisma.batch.findFirst({
                where: {
                    itemId: batchData.itemId,
                    batchNumber: batchData.batchNumber,
                },
            });

            if (existingBatch) {
                return apiError(res, {
                    message: `Batch number "${batchData.batchNumber}" already exists for this medicine. Please use a unique batch number.`,
                });
            }

            const result = await prisma.$transaction(async (tx) => {
                const batch = await tx.batch.create({ data: batchData });

                await upsertPriceRule(PriceEntityType.PHARMACY, batch.id, Number(sellingPrice) || 0, { mrp: mrp ? Number(mrp) : undefined, costPrice: costPrice ? Number(costPrice) : undefined }, tx);

                await tx.stockMovement.create({
                    data: {
                        batchId: batch.id,
                        movementType: "ADD",
                        quantity: batchData.quantity,
                        reason: "Initial purchase – Batch addition",
                    },
                });

                const priceRule = await getActivePrice(PriceEntityType.PHARMACY, batch.id, tx);
                return {
                    ...batch,
                    sellingPrice: priceRule?.price ?? 0,
                    costPrice: priceRule?.costPrice ?? 0,
                    mrp: priceRule?.mrp ?? 0,
                };
            });

            return apiSuccess(res, { data: result, message: "Batch added successfully" });
        } catch (error: any) {
            console.error("Add batch error", error);

            if (error?.code === "P2002" && error?.meta?.target?.includes("batchNumber")) {
                return apiError(res, {
                    message: `Batch number "${req.body.batchNumber}" already exists for this medicine. Please use a unique batch number.`,
                });
            }

            return apiError(res, { message: "Internal server error" });
        }
    },
    updateBatch: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { sellingPrice, costPrice, mrp, ...batchData } = req.body;

            batchData.expiryDate = batchData.expiryDate || null;

            const result = await prisma.$transaction(async (tx) => {
                const batch = await tx.batch.update({
                    where: { id },
                    data: batchData,
                });

                // Only update price rule if any price field was provided
                const hasPriceUpdate = sellingPrice !== undefined || mrp !== undefined || costPrice !== undefined;
                if (hasPriceUpdate) {
                    await upsertPriceRule(
                        PriceEntityType.PHARMACY,
                        id,
                        Number(sellingPrice || 0),
                        {
                            mrp: mrp !== undefined ? Number(mrp) : undefined,
                            costPrice: costPrice !== undefined ? Number(costPrice) : undefined,
                        },
                        tx,
                    );
                }

                const priceRule = await getActivePrice(PriceEntityType.PHARMACY, id, tx);
                return {
                    ...batch,
                    sellingPrice: priceRule?.price || 0,
                    costPrice: priceRule?.costPrice || 0,
                    mrp: priceRule?.mrp || 0,
                };
            });

            return apiSuccess(res, {
                data: result,
                message: "Batch updated successfully",
            });
        } catch (error) {
            console.error("Update batch error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    dispenseItem: async (req: Request, res: Response) => {
        try {
            const { batchId, quantity, pharmacistId, prescriptionId, customerName, customerPhone } = req.body;

            const result = await prisma.$transaction(async (tx) => {
                // 1. Check if batch has enough quantity
                const batch = await tx.batch.findUnique({
                    where: { id: batchId },
                });

                if (!batch || batch.quantity < quantity) {
                    throw new Error("Insufficient stock in this batch");
                }

                // 2. Reduce batch quantity
                const updatedBatch = await tx.batch.update({
                    where: { id: batchId },
                    data: {
                        quantity: { decrement: quantity },
                    },
                });

                // 3. Get Price
                const unitPrice = await getActivePriceAmount(PriceEntityType.PHARMACY, batchId, tx);

                // 4. Create Dispensation record
                const dispensation = await tx.dispensation.create({
                    data: {
                        batchId,
                        pharmacistId,
                        prescriptionId,
                        quantity,
                        // We are using @ignore fields in schema, but for Dispensation (Transaction),
                        // we might need to store them. Since they are ignored in Prisma Client,
                        // we might have an issue here if we don't handle the DB write directly or un-ignore them.
                        // Assuming for now we handle them as part of the new system.
                        sellingPrice: unitPrice,
                        totalAmount: quantity * unitPrice,
                        customerName,
                        customerPhone,

                        status: "COMPLETED",
                    },
                });

                // 4. Create Stock Movement record (The audit trail)
                await tx.stockMovement.create({
                    data: {
                        batchId,
                        movementType: "REMOVE",
                        quantity,
                        reason: `Dispensed to ${customerName || "Patient"}`,
                        dispensationId: dispensation.id,
                    },
                });

                // 4. Record in Bill if it's for a patient
                if (prescriptionId) {
                    const prescription = await tx.prescription.findUnique({
                        where: { id: prescriptionId },
                        select: { patientId: true },
                    });

                    if (prescription?.patientId) {
                        await addItemToBill({
                            patientId: prescription.patientId,
                            entityId: batchId,
                            entityType: BillItemType.PHARMACY,
                            quantity,
                            tx,
                            billType: "PHARMACY",
                        });
                    }
                }

                return dispensation;
            });

            return apiSuccess(res, {
                data: result,
                message: "Item dispensed successfully",
            });
        } catch (error: any) {
            console.error("Dispense error:", error);
            return apiError(res, {
                message: "Unable to dispense item",
            });
        }
    },
    getPrescriptionsByPatientId: async (req: Request, res: Response) => {
        try {
            const patientId = req.params.patientId as string;
            const prescriptions = await prisma.prescription.findMany({
                where: { patientId, prescriptionItems: { some: {} } },
                select: {
                    id: true,
                    discount: true,
                    createdAt: true,
                    doctor: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    fName: true,
                                    lName: true,
                                },
                            },
                        },
                    },
                    prescriptionItems: {
                        select: {
                            id: true,
                            dosage: true,
                            frequency: true,
                            duration: true,
                            itemId: true,

                            item: {
                                select: {
                                    id: true,
                                    name: true,
                                    strength: true,
                                    brand: true,
                                    unit: true,
                                },
                            },
                        },
                    },
                },
            });
            return apiSuccess(res, {
                data: prescriptions,
                message: "Prescriptions fetched successfully",
            });
        } catch (error) {
            console.error("Prescription fetch error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    getAllBills: async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;
        const searchQuery = req.query.searchQuery as string;
        const status = req.query.status as BillStatus;

        try {
            const where: Prisma.BillWhereInput = {
                ...(status && status !== ("ALL" as any) ? { status } : {}),
                ...(searchQuery
                    ? {
                          OR: [
                              { id: { contains: searchQuery, mode: "insensitive" } },
                              { externalName: { contains: searchQuery, mode: "insensitive" } },
                              { externalPhone: { contains: searchQuery, mode: "insensitive" } },
                              {
                                  patient: {
                                      user: {
                                          OR: [{ fName: { contains: searchQuery, mode: "insensitive" } }, { lName: { contains: searchQuery, mode: "insensitive" } }],
                                      },
                                  },
                              },
                          ],
                      }
                    : {}),
                type: "PHARMACY",
            };

            const [total, bills, allBillsForStats] = await Promise.all([
                prisma.bill.count({ where }),
                prisma.bill.findMany({
                    where,
                    take: limit,
                    skip,
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        patientId: true,
                        patient: {
                            select: {
                                user: {
                                    select: {
                                        fName: true,
                                        lName: true,
                                    },
                                },
                            },
                        },
                        externalName: true,
                        externalPhone: true,
                        createdAt: true,
                        items: true,
                        status: true,
                    },
                }),
                // Fetch all non-cancelled bills to calculate global stats
                prisma.bill.findMany({
                    where: { status: { not: "CANCELLED" },type: "PHARMACY" },
                    select: {
                        items: {
                            where: { status: "ACTIVE" },
                            select: { unitPrice: true, quantity: true },
                        },
                        adjustments: {
                            where: { active: true },
                            select: { type: true, mode: true, value: true },
                        },
                        payments: {
                            select: { amount: true, type: true },
                        },
                    },
                }),
            ]);

            let totalRevenue = 0;
            let totalCollected = 0;

            for (const bill of allBillsForStats) {
                const subtotal = bill.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
                let billTotal = subtotal;
                for (const adj of bill.adjustments) {
                    const val = adj.mode === "PERCENTAGE" ? (subtotal * adj.value) / 100 : adj.value;
                    if (adj.type === "DISCOUNT" || adj.type === "WAIVER") billTotal -= val;
                    else if (adj.type === "EXTRA_CHARGE") billTotal += val;
                }
                totalRevenue += Math.max(0, billTotal);

                const paid = bill.payments.filter((p) => p.type === "PAYMENT" || p.type === "ADVANCE").reduce((s, p) => s + p.amount, 0);
                const refunded = bill.payments.filter((p) => p.type === "REFUND").reduce((s, p) => s + p.amount, 0);
                totalCollected += paid - refunded;
            }

            return apiSuccess(res, {
                data: bills,
                message: "Bills fetched successfully",
                metadata: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    stats: {
                        totalRevenue,
                        totalCollected,
                        totalOutstanding: totalRevenue - totalCollected,
                    },
                },
            });
        } catch (error) {
            console.error("Bill fetch error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    getBillById: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const bill = await prisma.bill.findUnique({
                where: { id },
                select: {
                    id: true,
                    patientId: true,
                    notes: true,
                    finalizedAt: true,
                    patient: {
                        select: {
                            user: {
                                select: {
                                    fName: true,
                                    lName: true,
                                },
                            },
                        },
                    },
                    externalName: true,
                    externalPhone: true,
                    createdAt: true,
                    updatedAt: true,
                    status: true,
                    items: {
                        select: {
                            id: true,
                            referenceId: true,
                            referenceType: true,
                            quantity: true,
                            unitPrice: true,
                            priceRuleId: true,
                            title: true,
                            taxPercent: true,
                            status: true,
                        },
                    },
                    adjustments: {
                        where: { active: true },
                    },
                    payments: {
                        orderBy: { createdAt: "asc" },
                    },
                },
            });
            if (!bill) {
                return apiError(res, { message: "Bill not found" });
            }
            return apiSuccess(res, {
                data: bill,
                message: "Bill fetched successfully",
            });
        } catch (error) {
            console.error("Bill fetch error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    getPaymentsByBillId: async (req: Request, res: Response) => {
        try {
            const { id: billId } = req.params;
            const payments = await prisma.payment.findMany({
                where: { billId },
                orderBy: { createdAt: "asc" },
            });
            return apiSuccess(res, { data: payments, message: "Payments fetched successfully" });
        } catch (error) {
            console.error("Payments fetch error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    recordPayment: async (req: Request, res: Response) => {
        try {
            const { id: billId } = req.params;
            const { amount, paymentMethod, type = "PAYMENT", txId, notes } = req.body;

            const result = await prisma.$transaction(async (tx) => {
                const bill = await tx.bill.findUnique({
                    where: { id: billId },
                    include: {
                        items: { where: { status: "ACTIVE" } },
                        adjustments: { where: { active: true } },
                        payments: true,
                    },
                });

                if (!bill) throw new Error("Bill not found");
                if (bill.status === "CANCELLED") throw new Error("Cannot record payment for a cancelled bill");
                if (bill.status === "PAID" && type === "PAYMENT") throw new Error("Bill is already fully paid");

                // Compute bill total from items + adjustments
                const subtotal = bill.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
                let total = subtotal;
                for (const adj of bill.adjustments) {
                    const adjVal = adj.mode === "PERCENTAGE" ? (subtotal * adj.value) / 100 : adj.value;
                    if (adj.type === "DISCOUNT" || adj.type === "WAIVER") {
                        total -= adjVal;
                    } else if (adj.type === "EXTRA_CHARGE") {
                        total += adjVal;
                    }
                }
                total = Math.max(0, total);

                // Compute net amount already paid
                const totalPaid = bill.payments.filter((p) => p.type === "PAYMENT" || p.type === "ADVANCE").reduce((sum, p) => sum + p.amount, 0);
                const totalRefunded = bill.payments.filter((p) => p.type === "REFUND").reduce((sum, p) => sum + p.amount, 0);
                const netPaid = totalPaid - totalRefunded;
                const outstanding = total - netPaid;

                if (type === "PAYMENT" && amount > outstanding + 0.01) {
                    throw new Error(`Payment ₹${amount} exceeds outstanding balance ₹${outstanding.toFixed(2)}`);
                }

                const payment = await tx.payment.create({
                    data: {
                        billId,
                        amount,
                        type: type as PaymentFlowType,
                        paymentMethod: paymentMethod as PaymentType,
                        txId,
                        notes,
                    },
                });

                // Recalculate status after this payment
                const inflow = type === "PAYMENT" || type === "ADVANCE" ? amount : 0;
                const outflow = type === "REFUND" ? amount : 0;
                const newNetPaid = netPaid + inflow - outflow;

                let newStatus: BillStatus;
                if (newNetPaid >= total - 0.01) {
                    newStatus = BillStatus.PAID;
                } else if (newNetPaid > 0) {
                    newStatus = BillStatus.PARTIAL;
                } else {
                    newStatus = BillStatus.ACTIVE;
                }

                await tx.bill.update({
                    where: { id: billId },
                    data: { status: newStatus, ...(newStatus === "PAID" ? { finalizedAt: new Date() } : {}) },
                });

                return payment;
            });

            return apiSuccess(res, { data: result, message: "Payment recorded successfully" });
        } catch (error: any) {
            console.error("Payment recording error:", error);
            return apiError(res, { message: error.message || "Failed to record payment" });
        }
    },
    // getBillByPatientId: async (req: Request, res: Response) => {
    //     try {
    //         const id = req.params.id as string;
    //         const bill = await prisma.bill.findMany({
    //             where: { patientId: id },
    //             select: {
    //                 id: true,
    //                 patientId: true,
    //                 patient: {
    //                     select: {
    //                         user: {
    //                             select: {
    //                                 fName: true,
    //                                 lName: true,
    //                             },
    //                         },
    //                     },
    //                 },
    //                 patientName: true,
    //                 patientPhone: true,
    //                 createdAt: true,
    //                 items: {
    //                     select: {
    //                         id: true,
    //                         itemId: true,
    //                         batchId: true,
    //                         referenceId: true,
    //                         quantity: true,
    //                         unitPrice: true,
    //                         totalAmount: true,
    //                         type: true,
    //                         item: {
    //                             select: {
    //                                 id: true,
    //                                 name: true,
    //                                 strength: true,
    //                                 brand: true,
    //                                 unit: true,
    //                             },
    //                         },
    //                         batch: {
    //                             select: {
    //                                 id: true,
    //                                 batchNumber: true,
    //                                 expiryDate: true,
    //                                 mfgDate: true,
    //                                 sellingPrice: true,
    //                             },
    //                         },
    //                     },
    //                 },
    //             },
    //         });
    //         return apiSuccess(res, {
    //             data: bill,
    //             message: "Bill fetched successfully",
    //         });
    //     } catch (error) {
    //         console.error("Bill fetch error:", error);
    //         return apiError(res, {
    //             message: "Failed to fetch bill",
    //         });
    //     }
    // },
    // createBill: async (req: Request, res: Response) => {
    //     try {
    //         const body: billType = req.body;

    //         // return
    //         const bill = await prisma.$transaction(async (tx) => {
    //             const bill = await prisma.bill.create({
    //                 data: {
    //                     patientId: body.patientId,
    //                     patientName: body.patientName,
    //                     patientPhone: body.patientPhone,
    //                     discount: body.discount,
    //                     paymentType: body.paymentType,
    //                 },
    //             });
    //             const items = await prisma.billItem.createMany({
    //                 data: body.items.map((item) => ({
    //                     billId: bill.id,
    //                     itemId: item.itemId,
    //                     batchId: item.batchId,
    //                     quantity: item.quantity,
    //                     unitPrice: item.sellingPrice,
    //                     totalAmount: item.totalAmount,
    //                     type: "PHARMACY",
    //                 })),
    //             });
    //         });
    //         return apiSuccess(res, {
    //             data: bill,
    //             message: "Bill created successfully",
    //         });
    //     } catch (error) {
    //         console.error("Bill creation error:", error);
    //         return apiError(res, {
    //             message: "Failed to create bill",
    //         });
    //     }
    // },
    createBill: async (req: Request, res: Response) => {
        try {
            const body: billType = req.body;

            // Pre-validation: Check stock availability and gather item titles
            const itemsWithDetails: ((typeof body.items)[0] & { title: string; unitsPerStrip?: number | null })[] = [];
            for (const item of body.items) {
                const batch = await prisma.batch.findUnique({
                    where: { id: item.batchId },
                    include: {
                        item: true,
                    },
                });

                if (!batch) {
                    return apiError(res, {
                        message: `Batch not found for item ${item.itemId}`,
                    });
                }

                if (batch.quantity < item.quantity) {
                    return apiError(res, {
                        message: `Insufficient stock for batch ${batch.batchNumber}. Available: ${batch.quantity}, Requested: ${item.quantity}`,
                    });
                }

                if (batch.expiryDate && batch.expiryDate < new Date()) {
                    return apiError(res, {
                        message: `Batch ${batch.batchNumber} has expired`,
                    });
                }

                itemsWithDetails.push({
                    ...item,
                    title: `${batch.item.name} (${batch.batchNumber})`,
                    unitsPerStrip: batch.unitsPerStrip,
                });
            }

            const bill = await prisma.$transaction(async (tx) => {
                const billRecord = await tx.bill.create({
                    data: {
                        patientId: body.patientId,
                        type: "PHARMACY",
                        externalName: body.patientName,
                        externalPhone: body.patientPhone,
                        status: "ACTIVE",
                    },
                });

                let computedTotal = 0;

                // 2. Create bill items and decrement stock
                for (const item of itemsWithDetails) {
                    // Decrement stock
                    await tx.batch.update({
                        where: { id: item.batchId },
                        data: {
                            quantity: {
                                decrement: item.quantity,
                            },
                        },
                    });

                    // 3. Get official Price from DB
                    const priceRule = await getActivePrice(PriceEntityType.PHARMACY, item.batchId, tx);
                    const baseUnitPrice = priceRule?.price || item.sellingPrice;

                    let unitPrice = baseUnitPrice;
                    if (item.unitsPerStrip && item.unitsPerStrip > 1) {
                        unitPrice = baseUnitPrice / item.unitsPerStrip;
                    }

                    const lineTotal = unitPrice * item.quantity;
                    computedTotal += lineTotal;

                    // Create bill item
                    await tx.billItem.create({
                        data: {
                            billId: billRecord.id,
                            referenceType: "PHARMACY",
                            referenceId: item.batchId,
                            title: item.title,
                            quantity: item.quantity,
                            unitPrice: unitPrice,
                            priceRuleId: priceRule?.id,
                            taxPercent: 0,
                        },
                    });
                }

                // 3. Create adjustments
                if ((body as any).adjustments && (body as any).adjustments.length > 0) {
                    for (const adj of (body as any).adjustments) {
                        await tx.billAdjustment.create({
                            data: {
                                billId: billRecord.id,
                                type: adj.type as any,
                                mode: adj.mode as any,
                                value: adj.value,
                                reason: adj.reason || `Pharmacy bill ${adj.type.toLowerCase()}`,
                            },
                        });

                        const adjVal = adj.mode === "PERCENTAGE" ? (computedTotal * adj.value) / 100 : adj.value;
                        if (adj.type === "DISCOUNT" || adj.type === "WAIVER") {
                            computedTotal -= adjVal;
                        } else if (adj.type === "EXTRA_CHARGE") {
                            computedTotal += adjVal;
                        }
                    }
                } else if (body.discount && body.discount > 0) {
                    // Fallback for older frontend format
                    await tx.billAdjustment.create({
                        data: {
                            billId: billRecord.id,
                            type: "DISCOUNT",
                            mode: "FIXED",
                            value: body.discount,
                            reason: "Pharmacy bill discount",
                        },
                    });
                    computedTotal -= body.discount;
                }

                // 4. Record payment if applicable
                if (body.paymentType) {
                    await tx.payment.create({
                        data: {
                            billId: billRecord.id,
                            amount: Math.max(0, computedTotal),
                            type: "PAYMENT",
                            paymentMethod: body.paymentType,
                            txId: body.txId,
                        },
                    });
                }

                // Recalculate status of the billRecord after additions and potential payment
                const updatedItems = await tx.billItem.findMany({
                    where: { billId: billRecord.id, status: "ACTIVE" },
                });
                const updatedAdjustments = await tx.billAdjustment.findMany({
                    where: { billId: billRecord.id, active: true },
                });
                const updatedPayments = await tx.payment.findMany({
                    where: { billId: billRecord.id },
                });

                const subtotal = updatedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
                let total = subtotal;
                for (const adj of updatedAdjustments) {
                    const adjVal = adj.mode === "PERCENTAGE" ? (subtotal * adj.value) / 100 : adj.value;
                    if (adj.type === "DISCOUNT" || adj.type === "WAIVER") {
                        total -= adjVal;
                    } else if (adj.type === "EXTRA_CHARGE") {
                        total += adjVal;
                    }
                }
                total = Math.max(0, total);

                const totalPaid = updatedPayments.filter((p) => p.type === "PAYMENT" || p.type === "ADVANCE").reduce((sum, p) => sum + p.amount, 0);
                const totalRefunded = updatedPayments.filter((p) => p.type === "REFUND").reduce((sum, p) => sum + p.amount, 0);
                const netPaid = totalPaid - totalRefunded;

                let newStatus: BillStatus = BillStatus.ACTIVE;
                if (netPaid >= total - 0.01) {
                    newStatus = BillStatus.PAID;
                } else if (netPaid > 0) {
                    newStatus = BillStatus.PARTIAL;
                }

                await tx.bill.update({
                    where: { id: billRecord.id },
                    data: {
                        status: newStatus,
                        ...(newStatus === "PAID" ? { finalizedAt: new Date() } : {}),
                    },
                });

                // Return the complete bill with items and adjustments
                return await tx.bill.findUnique({
                    where: { id: billRecord.id },
                    include: {
                        items: true,
                        adjustments: true,
                        payments: true,
                    },
                });
            });

            return apiSuccess(res, {
                data: bill,
                message: "Bill created successfully",
            });
        } catch (error) {
            console.error("Bill creation error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    cancelBill: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const result = await prisma.$transaction(async (tx) => {
                const bill = await tx.bill.findUnique({
                    where: { id },
                    include: { items: { where: { status: "ACTIVE" } } },
                });

                if (!bill) throw new Error("Bill not found");
                if (bill.status === "CANCELLED") throw new Error("Bill is already cancelled");
                if (bill.status === "PAID") throw new Error("Cannot cancel a fully paid bill. Process a refund instead.");

                // 1. Restore stock for all pharmacy items
                for (const item of bill.items) {
                    if (item.referenceType === "PHARMACY" && item.referenceId) {
                        await tx.batch.update({
                            where: { id: item.referenceId },
                            data: { quantity: { increment: item.quantity } },
                        });
                    }
                }

                // 2. Update bill status
                const updatedBill = await tx.bill.update({
                    where: { id },
                    data: {
                        status: "CANCELLED",
                        notes: bill.notes ? `${bill.notes}\nCancelled: ${reason}` : `Cancelled: ${reason}`,
                    },
                });

                return updatedBill;
            });

            return apiSuccess(res, { data: result, message: "Bill cancelled successfully" });
        } catch (error: any) {
            console.error("Bill cancellation error:", error);
            return apiError(res, { message: error.message || "Failed to cancel bill" });
        }
    },
    updateBill: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { notes, status, externalName, externalPhone } = req.body;

            const bill = await prisma.$transaction(async (tx) => {
                const existingBill = await tx.bill.findUnique({
                    where: { id },
                    include: { items: true, adjustments: true },
                });

                if (!existingBill) {
                    throw new Error("Bill not found");
                }

                // Create a version snapshot before updating
                await tx.billVersion.create({
                    data: {
                        billId: id,
                        snapshot: existingBill as any,
                        reason: "Manual update via Pharmacy Controller",
                    },
                });

                return await tx.bill.update({
                    where: { id },
                    data: {
                        notes,
                        status: status as BillStatus,
                        externalName,
                        externalPhone,
                    },
                    include: {
                        items: true,
                        adjustments: true,
                        payments: true,
                    },
                });
            });

            return apiSuccess(res, {
                data: bill,
                message: "Bill updated successfully",
            });
        } catch (error: any) {
            console.error("Bill update error:", error);
            return apiError(res, { message: error.message || "Failed to update bill" });
        }
    },
    manageBillAdjustments: async (req: Request, res: Response) => {
        try {
            const { billId } = req.params;
            const { adjustments } = req.body; // Array of { type, mode, value, reason, billItemId?, active? }

            const result = await prisma.$transaction(async (tx) => {
                const createdAdjustments = [];
                for (const adj of adjustments) {
                    if (adj.id) {
                        // Update existing adjustment
                        const updated = await tx.billAdjustment.update({
                            where: { id: adj.id },
                            data: {
                                type: adj.type as AdjustmentType,
                                mode: adj.mode as AdjustmentMode,
                                value: adj.value,
                                reason: adj.reason,
                                active: adj.active,
                            },
                        });
                        createdAdjustments.push(updated);
                    } else {
                        // Create new adjustment
                        const created = await tx.billAdjustment.create({
                            data: {
                                billId,
                                billItemId: adj.billItemId,
                                type: adj.type as AdjustmentType,
                                mode: adj.mode as AdjustmentMode,
                                value: adj.value,
                                reason: adj.reason,
                            },
                        });
                        createdAdjustments.push(created);
                    }
                }
                return createdAdjustments;
            });

            return apiSuccess(res, {
                data: result,
                message: "Bill adjustments updated successfully",
            });
        } catch (error: any) {
            console.error("Adjustment update error:", error);
            return apiError(res, { message: error.message || "Failed to update adjustments" });
        }
    },
    getBatchesByItemId: async (req: Request, res: Response) => {
        try {
            const itemId = req.params.itemId as string;
            const batches = await prisma.batch.findMany({
                where: { itemId },
                orderBy: {
                    expiryDate: "desc",
                },
            });

            const batchesWithPrices = await Promise.all(
                batches.map(async (batch) => {
                    const priceRule = await getActivePrice(PriceEntityType.PHARMACY, batch.id);
                    return {
                        ...batch,
                        sellingPrice: priceRule?.price || 0,
                        costPrice: priceRule?.costPrice || 0,
                        mrp: priceRule?.mrp || 0,
                    };
                }),
            );

            return apiSuccess(res, {
                data: batchesWithPrices,
                message: "Batches fetched successfully",
            });
        } catch (error) {
            console.error("Batch fetch error");
            return res.status(500).json({ message: "Internal server error" });
        }
    },
};
