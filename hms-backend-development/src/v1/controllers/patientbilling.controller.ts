import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { apiError, apiSuccess } from "../utils/formatter";
import { BillStatus, BillItemStatus, AdjustmentType, AdjustmentMode, PaymentType, PaymentFlowType, PriceEntityType } from "@prisma/client";
import { addItemToBill } from "../utils/billing.util";
import { getActivePrice } from "../utils/pricing.util";

export const PatientBillingController = {
    /**
     * Get comprehensive bill summary for an admission using the new Billing models.
     */
    getBillSummary: async (req: Request, res: Response) => {
        try {
            const { id: admissionId } = req.params;

            // Find admission to get patientId
            const admission = await prisma.admission.findUnique({
                where: { id: admissionId },
                include: {
                    patient: {
                        include: {
                            user: {
                                select: {
                                    fName: true,
                                    lName: true,
                                    phoneNumber: true,
                                    email: true,
                                },
                            },
                        },
                    },
                    admittingDoctor: {
                        include: {
                            user: {
                                select: {
                                    fName: true,
                                    lName: true,
                                },
                            },
                        },
                    },
                    
                    reference: {
                        include: {
                            referralUser: true,
                        }
                    }
                },
            });

            if (!admission) {
                return apiError(res, { message: "Admission not found", status: 404 });
            }

            // Find active bill for this admission (IPD Context)
            // We search for bills that are not PAID or CANCELLED
            const bill = await prisma.bill.findFirst({
                where: {
                    patientId: admission.patientId,
                    type: "IPD",
                    admissionId: admissionId,
                    // status: { in: [BillStatus.DRAFT, BillStatus.ACTIVE, BillStatus.PARTIAL] }
                },
                include: {
                    items: {
                        where: { status: BillItemStatus.ACTIVE },
                        include: {
                            billAdjustments: { where: { active: true } },
                        },
                    },
                    adjustments: { where: { active: true } },
                    payments: {
                        orderBy: { createdAt: "desc" },
                    },
                },
                orderBy: { createdAt: "desc" },
            });

            if (!bill) {
                return apiSuccess(res, {
                    data: {
                        admission,
                        bill: null,
                        message: "No active bill found for this patient",
                    },
                });
            }

            // Calculate totals
            const items = bill.items.map((item) => {
                const itemSubtotal = item.unitPrice * item.quantity;
                const taxAmount = (itemSubtotal * (item.taxPercent || 0)) / 100;

                // Item level adjustments (extra charges or discounts applied to specific item)
                const itemAdjustmentsTotal = item.billAdjustments.reduce((sum, adj) => {
                    let val = 0;
                    if (adj.mode === AdjustmentMode.PERCENTAGE) {
                        val = (itemSubtotal * adj.value) / 100;
                    } else {
                        val = adj.value;
                    }
                    return adj.type === AdjustmentType.EXTRA_CHARGE ? sum + val : sum - val;
                }, 0);

                return {
                    ...item,
                    subtotal: itemSubtotal,
                    taxAmount,
                    adjustmentsTotal: itemAdjustmentsTotal,
                    finalAmount: itemSubtotal + taxAmount + itemAdjustmentsTotal,
                };
            });

            const totalItemsAmount = items.reduce((sum, item) => sum + item.finalAmount, 0);

            // Bill level adjustments (extra charges or discounts applied to whole bill)
            const billAdjustmentsTotal = bill.adjustments.reduce((sum, adj) => {
                let val = 0;
                if (adj.mode === AdjustmentMode.PERCENTAGE) {
                    val = (totalItemsAmount * adj.value) / 100;
                } else {
                    val = adj.value;
                }
                return adj.type === AdjustmentType.EXTRA_CHARGE ? sum + val : sum - val;
            }, 0);

            const totalPayable = totalItemsAmount + billAdjustmentsTotal;
            const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0);
            const balance = Math.max(0, totalPayable - totalPaid);

            return apiSuccess(res, {
                data: {
                    admission,
                    billId: bill.id,
                    billStatus: bill.status,
                    items,
                    adjustments: bill.adjustments,
                    payments: bill.payments,
                    totals: {
                        totalItemsAmount,
                        billAdjustmentsTotal,
                        totalPayable,
                        totalPaid,
                        balance,
                        isFullyPaid: balance <= 0,
                    },
                },
            });
        } catch (error: any) {
            console.error("Error in getBillSummary:", error);
            return apiError(res, { message: error.message || "Internal server error" });
        }
    },

    /**
     * Internal helper to synchronize bill status based on payments and totals.
     */
    syncBillStatus: async (billId: string) => {
        const bill = await prisma.bill.findUnique({
            where: { id: billId },
            include: {
                items: {
                    where: { status: BillItemStatus.ACTIVE },
                    include: { billAdjustments: { where: { active: true } } },
                },
                adjustments: { where: { active: true } },
                payments: true,
            },
        });

        if (!bill) return;

        // Calculate Items Total
        let totalItemsAmount = 0;
        bill.items.forEach((item) => {
            const itemSubtotal = item.unitPrice * item.quantity;
            const taxAmount = (itemSubtotal * (item.taxPercent || 0)) / 100;
            const itemAdjustments = item.billAdjustments.reduce((sum, adj) => {
                const val = adj.mode === AdjustmentMode.PERCENTAGE ? (itemSubtotal * adj.value) / 100 : adj.value;
                return adj.type === AdjustmentType.EXTRA_CHARGE ? sum + val : sum - val;
            }, 0);
            totalItemsAmount += itemSubtotal + taxAmount + itemAdjustments;
        });

        // Calculate Bill Adjustments
        const billAdjustmentsTotal = bill.adjustments.reduce((sum, adj) => {
            const val = adj.mode === AdjustmentMode.PERCENTAGE ? (totalItemsAmount * adj.value) / 100 : adj.value;
            return adj.type === AdjustmentType.EXTRA_CHARGE ? sum + val : sum - val;
        }, 0);

        const totalPayable = totalItemsAmount + billAdjustmentsTotal;
        const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0);

        let newStatus = bill.status;
        if (totalPaid >= totalPayable && totalPayable > 0) {
            newStatus = BillStatus.PAID;
        } else if (totalPaid > 0) {
            newStatus = BillStatus.PARTIAL;
        } else if (bill.status === BillStatus.PAID || bill.status === BillStatus.PARTIAL) {
            newStatus = BillStatus.ACTIVE;
        }

        if (newStatus !== bill.status) {
            await prisma.bill.update({
                where: { id: billId },
                data: { status: newStatus },
            });
        }
    },

    /**
     * Process a payment against a bill.
     */
    processPayment: async (req: Request, res: Response) => {
        try {
            const { billId, amount, paymentMethod, txId, notes, type } = req.body;

            if (!billId || !amount || !paymentMethod) {
                return apiError(res, { message: "Missing required fields", status: 400 });
            }

            const bill = await prisma.bill.findUnique({
                where: { id: billId },
            });

            if (!bill) {
                return apiError(res, { message: "Bill not found", status: 404 });
            }

            const payment = await prisma.payment.create({
                data: {
                    billId,
                    amount: parseFloat(amount),
                    paymentMethod: paymentMethod as PaymentType,
                    type: (type as PaymentFlowType) || PaymentFlowType.PAYMENT,
                    notes,
                    txId: txId || null,
                },
            });

            // Re-calculate totals and sync status
            await PatientBillingController.syncBillStatus(billId);

            return apiSuccess(res, {
                data: payment,
                message: "Payment processed successfully",
            });
        } catch (error: any) {
            console.error("Error in processPayment:", error);
            return apiError(res, { message: error.message || "Internal server error" });
        }
    },

    /**
     * Add a discount or extra charge to a bill or bill item.
     */
    addBillAdjustment: async (req: Request, res: Response) => {
        try {
            const { billId, billItemId, type, mode, value, reason } = req.body;

            if (!billId || !type || !mode || value === undefined) {
                return apiError(res, { message: "Missing required fields", status: 400 });
            }

            const adjustment = await prisma.billAdjustment.create({
                data: {
                    billId,
                    billItemId,
                    type: type as AdjustmentType,
                    mode: mode as AdjustmentMode,
                    value: parseFloat(value),
                    reason,
                },
            });

            await PatientBillingController.syncBillStatus(billId);

            return apiSuccess(res, {
                data: adjustment,
                message: "Adjustment added successfully",
            });
        } catch (error: any) {
            console.error("Error in addBillAdjustment:", error);
            return apiError(res, { message: error.message || "Internal server error" });
        }
    },

    /**
     * Update a bill item (quantity, price, title).
     */
    updateBillItem: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { quantity, unitPrice, title } = req.body;

            const updatedItem = await prisma.billItem.update({
                where: { id },
                data: {
                    quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
                    unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined,
                    title,
                },
            });

            await PatientBillingController.syncBillStatus(updatedItem.billId);

            return apiSuccess(res, {
                data: updatedItem,
                message: "Bill item updated successfully",
            });
        } catch (error: any) {
            console.error("Error in updateBillItem:", error);
            return apiError(res, { message: error.message || "Internal server error" });
        }
    },

    /**
     * Remove a bill item (soft delete).
     */
    deleteBillItem: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const item = await prisma.billItem.update({
                where: { id },
                data: { status: BillItemStatus.REMOVED },
            });

            await PatientBillingController.syncBillStatus(item.billId);

            return apiSuccess(res, {
                message: "Bill item removed successfully",
            });
        } catch (error: any) {
            console.error("Error in deleteBillItem:", error);
            return apiError(res, { message: error.message || "Internal server error" });
        }
    },

    /**
     * Remove an adjustment.
     */
    removeBillAdjustment: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const adj = await prisma.billAdjustment.update({
                where: { id },
                data: { active: false },
            });

            await PatientBillingController.syncBillStatus(adj.billId);

            return apiSuccess(res, {
                message: "Adjustment removed successfully",
            });
        } catch (error: any) {
            console.error("Error in removeBillAdjustment:", error);
            return apiError(res, { message: error.message || "Internal server error" });
        }
    },

    /**
     * Search for billable entities (Lab, Surgery, Treatment, etc.) to add to a bill.
     */
    searchBillableEntities: async (req: Request, res: Response) => {
        try {
            const { type, query } = req.query;
            const searchTerm = query ? String(query) : "";

            let results: any[] = [];

            switch (type) {
                case "LAB":
                    results = await prisma.labConfiguration.findMany({
                        where: { name: { contains: searchTerm, mode: "insensitive" } },
                        take: 20,
                        select: { id: true, name: true },
                    });
                    break;
                case "SURGERY":
                    results = await prisma.surgery.findMany({
                        where: { name: { contains: searchTerm, mode: "insensitive" } },
                        take: 20,
                        select: { id: true, name: true },
                    });
                    break;
                case "TREATMENT":
                    results = await prisma.treatmentConfiguration.findMany({
                        where: { name: { contains: searchTerm, mode: "insensitive" } },
                        take: 20,
                        select: { id: true, name: true },
                    });
                    break;
                case "PHYSIOTHERAPY":
                    results = await prisma.physioConfiguration.findMany({
                        where: { name: { contains: searchTerm, mode: "insensitive" } },
                        take: 20,
                        select: { id: true, name: true },
                    });
                    break;
                case "FOOD":
                    results = await prisma.foodItems.findMany({
                        where: { name: { contains: searchTerm, mode: "insensitive" } },
                        take: 20,
                        select: { id: true, name: true },
                    });
                    break;
                case "PHARMACY":
                    results = await prisma.batch
                        .findMany({
                            where: { item: { name: { contains: searchTerm, mode: "insensitive" } } },
                            include: { item: true },
                            take: 20,
                        })
                        .then((batches) => batches.map((b) => ({ id: b.id, name: `${b.item.name} (${b.batchNumber})` })));
                    break;
                case "ROOM":
                    results = await prisma.roomType.findMany({
                        where: { name: { contains: searchTerm, mode: "insensitive" } },
                        take: 20,
                        select: { id: true, name: true },
                    });
                    break;
                default:
                    return apiError(res, { message: "Invalid entity type", status: 400 });
            }

            if (results.length > 0) {
                let priceEntityType: PriceEntityType;
                switch (type) {
                    case "PHARMACY":
                        priceEntityType = PriceEntityType.PHARMACY;
                        break;
                    case "LAB":
                        priceEntityType = PriceEntityType.LAB;
                        break;
                    case "ROOM":
                        priceEntityType = PriceEntityType.ROOM_TYPE;
                        break;
                    case "SURGERY":
                        priceEntityType = PriceEntityType.SURGERY;
                        break;
                    case "TREATMENT":
                        priceEntityType = PriceEntityType.TREATMENT;
                        break;
                    case "PHYSIOTHERAPY":
                        priceEntityType = PriceEntityType.PHYSIOTHERAPY;
                        break;
                    case "FOOD":
                        priceEntityType = PriceEntityType.FOOD;
                        break;
                    default:
                        priceEntityType = PriceEntityType.TREATMENT;
                }

                results = await Promise.all(
                    results.map(async (res) => {
                        const priceRule = await getActivePrice(priceEntityType, res.id);
                        return {
                            ...res,
                            price: priceRule?.price || 0,
                            taxPercent: priceRule?.taxPercent || 0,
                        };
                    }),
                );
            }

            return apiSuccess(res, { data: results });
        } catch (error: any) {
            console.error("Error in searchBillableEntities:", error);
            return apiError(res, { message: error.message || "Internal server error" });
        }
    },

    /**
     * Add an item to a bill manually.
     */
    addBillItem: async (req: Request, res: Response) => {
        try {
            const { patientId, entityId, entityType, quantity, customPrice, notes, billType, admissionId, appointmentId } = req.body;

            if (!patientId || !entityId || !entityType) {
                return apiError(res, { message: "Missing required fields", status: 400 });
            }

            const newItem = await addItemToBill({
                patientId,
                entityId,
                entityType,
                quantity: quantity ? parseFloat(quantity) : 1,
                customPrice: customPrice ? parseFloat(customPrice) : undefined,
                notes,
                billType,
                admissionId,
                appointmentId,
            });

            await PatientBillingController.syncBillStatus(newItem.billId);

            return apiSuccess(res, {
                data: newItem,
                message: "Item added to bill successfully",
            });
        } catch (error: any) {
            console.error("Error in addBillItem:", error);
            return apiError(res, { message: error.message || "Internal server error" });
        }
    },

    /**
     * Get bill by appointmentId.
     */
    getBillByAppointmentId: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const bill = await prisma.bill.findFirst({
                where: {
                    OR: [
                        { appointmentId: id },
                        {
                            items: {
                                some: {
                                    referenceId: id,
                                },
                            },
                        },
                    ],
                },
                include: {
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
                    items: {
                        // where: { status: BillItemStatus.ACTIVE },
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
                return apiError(res, {
                    status: 404,
                    message: "Bill not found",
                });
            }

            const enrichedBill = await enrichBillData(bill);

            return apiSuccess(res, {
                data: enrichedBill,
                message: "Bill fetched successfully",
            });
        } catch (error: any) {
            console.error("Error in getBillByAppointmentId:", error);
            return apiError(res, {
                message: error.message || "Failed to fetch bill",
            });
        }
    },
    updatePaymentDetails: async (req: Request, res: Response) => {
        try {
            const { paymentId } = req.params;
            const body = req.body;

            const updatedPayment = await prisma.payment.update({
                where: { id: paymentId },
                data: {
                    amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
                    paymentMethod: body.paymentMethod !== undefined ? body.paymentMethod : undefined,
                    notes: body.notes !== undefined ? body.notes : undefined,
                },
            });

            // Re-sync bill status after payment update
            await PatientBillingController.syncBillStatus(updatedPayment.billId);

            return apiSuccess(res, {
                data: updatedPayment,
                message: "Payment details updated successfully",
            });
        } catch (error: any) {
            console.error("Error in updatePaymentDetails:", error);
            return apiError(res, { message: error.message || "Internal server error" });
        }
    },
    deletePaymentDetails: async (req: Request, res: Response) => {
        try {
            const { paymentId } = req.params;

            const payment = await prisma.payment.findUnique({
                where: { id: paymentId },
            });

            if (!payment) {
                return apiError(res, { message: "Payment not found", status: 404 });
            }

            await prisma.payment.delete({
                where: { id: paymentId },
            });

            // Re-sync bill status after payment deletion
            await PatientBillingController.syncBillStatus(payment.billId);

            return apiSuccess(res, {
                message: "Payment deleted successfully",
            });
        } catch (error: any) {
            console.error("Error in deletePayment:", error);
            return apiError(res, { message: error.message || "Internal server error" });
        }
    },
};

/**
 * Enriches a bill with fully populated item and batch details,
 * mapping polymorphic references and correcting unit/strip pricing.
 */
async function enrichBillData(bill: any, tx?: any) {
    if (!bill) return null;
    const client = tx || prisma;

    const enrichedItems = await Promise.all(
        bill.items.map(async (item: any) => {
            const baseItem = {
                ...item,
                type: item.referenceType,
                totalAmount: (item.quantity || 0) * (item.unitPrice || 0),
            };

            if (item.referenceType === "PHARMACY" && item.referenceId) {
                const batch = await client.batch.findUnique({
                    where: { id: item.referenceId },
                    include: { item: true },
                });

                if (batch) {
                    let finalUnitPrice = item.unitPrice;
                    if (batch.unitsPerStrip && batch.unitsPerStrip > 1) {
                        finalUnitPrice = item.unitPrice / batch.unitsPerStrip;
                    }

                    return {
                        ...baseItem,
                        unitPrice: finalUnitPrice,
                        totalAmount: (item.quantity || 0) * finalUnitPrice,
                        item: {
                            id: batch.item.id,
                            name: batch.item.name,
                            brand: batch.item.brand,
                            strength: batch.item.strength,
                            unit: batch.item.unit,
                        },
                        batch: {
                            id: batch.id,
                            batchNumber: batch.batchNumber,
                            expiryDate: batch.expiryDate,
                            unitsPerStrip: batch.unitsPerStrip,
                        },
                    };
                }
            }

            return baseItem;
        }),
    );

    return {
        ...bill,
        items: enrichedItems,
    };
}
