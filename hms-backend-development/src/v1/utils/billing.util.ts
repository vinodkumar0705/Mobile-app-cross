import { BillItemType, PriceEntityType, BillStatus, BillItemStatus, BillType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { getActivePrice } from "./pricing.util";

/**
 * Utility to dynamically add an item to a patient's bill.
 * If an active/draft bill exists for the patient, it adds to it.
 * Otherwise, it creates a new bill.
 */
export async function addItemToBill({
    patientId,
    entityId,
    entityType,
    quantity = 1,
    tx,
    title,
    customPrice,
    notes,
    billType,
    admissionId,
    appointmentId,
}: {
    patientId: string;
    entityId: string;
    entityType: BillItemType;
    quantity?: number;
    tx?: any;
    title?: string;
    customPrice?: number;
    notes?: string;
    billType?: BillType;
    admissionId?: string;
    appointmentId?: string;
}) {
    const client = tx || prisma;

    let resolvedAdmissionId = admissionId;
    let resolvedBillType = billType;

    // Self-healing fallback: if no admissionId is provided but patient is admitted, auto-link to active stay
    if (!resolvedAdmissionId && !appointmentId && patientId) {
        const activeAdmission = await client.admission.findFirst({
            where: {
                patientId,
                status: "ADMITTED",
            },
            select: { id: true },
        });
        if (activeAdmission) {
            resolvedAdmissionId = activeAdmission.id;
        }
    }

    if (resolvedAdmissionId) {
        resolvedBillType = "IPD";
    } else if (appointmentId) {
        resolvedBillType = "OPD";
    } else if (!resolvedBillType) {
        resolvedBillType = "EXTERNAL";
    }

    // 1. Find or create an active bill for the specific context
    let bill = await client.bill.findFirst({
        where: {
            patientId,
            type: resolvedBillType as any,
            admissionId: resolvedAdmissionId || null,
            appointmentId: appointmentId || null,
            status: { in: [BillStatus.DRAFT, BillStatus.ACTIVE, BillStatus.PARTIAL] },
        },
        orderBy: { createdAt: "desc" },
    });

    if (!bill) {
        bill = await client.bill.create({
            data: {
                patientId,
                type: resolvedBillType as any,
                admissionId: resolvedAdmissionId,
                appointmentId,
                status: BillStatus.ACTIVE,
                notes: notes || `System generated ${resolvedBillType} bill`,
            },
        });
    }

    // 2. Determine price and title
    let unitPrice = customPrice;
    let taxPercent = 0;
    let priceRuleId: string | undefined;

    if (unitPrice === undefined) {
        const priceEntityType = mapBillItemTypeToPriceEntityType(entityType);

        let effectiveDate = new Date();
        if (appointmentId) {
            const appt = await client.appointment.findUnique({
                where: { id: appointmentId },
                select: { appointmentDate: true },
            });
            if (appt?.appointmentDate) {
                effectiveDate = new Date(appt.appointmentDate);
            }
        } else if (resolvedAdmissionId) {
            const adm = await client.admission.findUnique({
                where: { id: resolvedAdmissionId },
                select: { admissionDateTime: true },
            });
            if (adm?.admissionDateTime) {
                effectiveDate = new Date(adm.admissionDateTime);
            }
        }

        const priceRule = await getActivePrice(priceEntityType, entityId, effectiveDate, client);

        unitPrice = priceRule?.price || 0;
        taxPercent = priceRule?.taxPercent || 0;
        priceRuleId = priceRule?.id;
    }

    const itemTitle = title || (await getEntityTitle(entityType, entityId, client));

    // 3. Create BillItem
    return await client.billItem.create({
        data: {
            billId: bill.id,
            referenceType: entityType,
            referenceId: entityId,
            title: itemTitle,
            quantity,
            unitPrice: unitPrice || 0,
            taxPercent: taxPercent || 0,
            priceRuleId,
            status: BillItemStatus.ACTIVE,
        },
    });
}

/**
 * Maps BillItemType to PriceEntityType for price lookup
 */
function mapBillItemTypeToPriceEntityType(type: BillItemType): PriceEntityType {
    const map: Partial<Record<BillItemType, PriceEntityType>> = {
        [BillItemType.PHARMACY]: PriceEntityType.PHARMACY,
        [BillItemType.LAB]: PriceEntityType.LAB,
        [BillItemType.CONSULTATION]: PriceEntityType.DOCTOR_CONSULTATION,
        [BillItemType.ROOM]: PriceEntityType.ROOM_TYPE,
        [BillItemType.SURGERY]: PriceEntityType.SURGERY,
        [BillItemType.TREATMENT]: PriceEntityType.TREATMENT,
        [BillItemType.FOOD]: PriceEntityType.FOOD,
        [BillItemType.PHYSIOTHERAPY]: PriceEntityType.PHYSIOTHERAPY,
    };
    return map[type] || PriceEntityType.TREATMENT;
}

export async function getBillIdByEntity(entityId: string, entityType: BillItemType, tx?: any) {
    const client = tx || prisma;
    const item = await client.billItem.findFirst({
        where: {
            referenceId: entityId,
            referenceType: entityType,
            status: BillItemStatus.ACTIVE,
        },
        orderBy: { createdAt: "desc" },
    });
    return item?.billId;
}

/**
 * Fetches the human-readable title for an entity
 */
async function getEntityTitle(type: BillItemType, id: string, tx: any): Promise<string> {
    const client = tx || prisma;
    try {
        switch (type) {
            case BillItemType.PHARMACY: {
                const batch = await client.batch.findUnique({
                    where: { id },
                    include: { item: true },
                });
                return batch ? `${batch.item.name} (${batch.batchNumber})` : "Medicine";
            }
            case BillItemType.LAB: {
                const lab = await client.labConfiguration.findUnique({ where: { id } });
                return lab?.name || "Laboratory Test";
            }
            case BillItemType.TREATMENT: {
                const treatment = await client.treatmentConfiguration.findUnique({ where: { id } });
                return treatment?.name || "Treatment/Procedure";
            }
            case BillItemType.PHYSIOTHERAPY: {
                const physioTherapy = await client.physioConfiguration.findUnique({ where: { id } });
                return physioTherapy?.name || "Physiotherapy Session";
            }
            case BillItemType.SURGERY: {
                const surgery = await client.surgery.findUnique({ where: { id } });
                return surgery?.name || "Surgery";
            }
            case BillItemType.FOOD: {
                const food = await client.foodItems.findUnique({ where: { id } });
                return food?.name || "Catering/Food";
            }
            case BillItemType.ROOM: {
                const roomType = await client.roomType.findUnique({ where: { id } });
                return roomType?.name || "Room Charges";
            }
            case BillItemType.CONSULTATION: {
                const doctor = await client.employeeInfo.findUnique({
                    where: { id },
                    include: { user: { select: { fName: true, lName: true } } },
                });
                return doctor ? `Consultation: Dr. ${doctor.user.fName} ${doctor.user.lName || ""}`.trim() : "Doctor Consultation";
            }
            default:
                return "Miscellaneous";
        }
    } catch (e) {
        return "Item";
    }
}

/**
 * Soft-delete a bill item by marking its status as REMOVED and syncing the parent bill status.
 * Returns the updated BillItem.
 */
export async function deleteBillItem(id: string, tx?: any) {
    const client = tx || prisma;

    const item = await client.billItem.update({
        where: { id },
        data: { status: BillItemStatus.REMOVED },
    });
    

    // Recalculate bill totals and sync status (same logic as controller.syncBillStatus)
    const bill = await client.bill.findUnique({
        where: { id: item.billId },
        include: {
            items: {
                where: { status: BillItemStatus.ACTIVE },
                include: { billAdjustments: { where: { active: true } } },
            },
            adjustments: { where: { active: true } },
            payments: true,
        },
    });

    if (bill) {
        let totalItemsAmount = 0;
        for (const it of bill.items) {
            const itemSubtotal = it.unitPrice * it.quantity;
            const taxAmount = (itemSubtotal * (it.taxPercent || 0)) / 100;
            const itemAdjustments = it.billAdjustments.reduce((sum: number, adj: any) => {
                const val = adj.mode === "PERCENTAGE" ? (itemSubtotal * adj.value) / 100 : adj.value;
                return adj.type === "EXTRA_CHARGE" ? sum + val : sum - val;
            }, 0);
            totalItemsAmount += itemSubtotal + taxAmount + itemAdjustments;
        }

        const billAdjustmentsTotal = bill.adjustments.reduce((sum: number, adj: any) => {
            const val = adj.mode === "PERCENTAGE" ? (totalItemsAmount * adj.value) / 100 : adj.value;
            return adj.type === "EXTRA_CHARGE" ? sum + val : sum - val;
        }, 0);

        const totalPayable = totalItemsAmount + billAdjustmentsTotal;
        const totalPaid = bill.payments.reduce((sum: number, p: any) => sum + p.amount, 0);

        let newStatus = bill.status;
        if (totalPaid >= totalPayable && totalPayable > 0) {
            newStatus = BillStatus.PAID;
        } else if (totalPaid > 0) {
            newStatus = BillStatus.PARTIAL;
        } else if (bill.status === BillStatus.PAID || bill.status === BillStatus.PARTIAL) {
            newStatus = BillStatus.ACTIVE;
        }

        if (newStatus !== bill.status) {
            await client.bill.update({ where: { id: bill.id }, data: { status: newStatus } });
        }
    }

    return item;
}
