import cron from "node-cron";
import { prisma } from "../../lib/prisma";

// Helper to normalize a Date to YYYY-MM-DD (midnight UTC)
function toDateOnly(d: Date) {
    const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    return dt;
}

export async function runRoomBilling(dryRun = false) {
    const today = toDateOnly(new Date());
    const billingCutoff = today; // bill for dates < billingCutoff (i.e., up to yesterday)

    const stays = await prisma.inpatientStaySession.findMany({
        where: { status: "ACTIVE" },
        include: {
            currentRoomBooking: { include: { room: true } },
            admission: true,
            patient: true,
        },
    });

    for (const s of stays) {
        try {
            const booking = s.currentRoomBooking;
            if (!booking) continue;

            // Determine last billed date from BillItem chargeDate
            const lastItem = await prisma.billItem.findFirst({
                where: {
                    referenceType: "ROOM",
                    referenceId: booking.id,
                    chargeDate: { not: null },
                },
                orderBy: { chargeDate: "desc" },
            });

            const startSource = booking.startTime ?? s.startedAt ?? new Date();
            let nextDate = toDateOnly(startSource);
            if (lastItem && lastItem.chargeDate) {
                const lastDate = toDateOnly(new Date(lastItem.chargeDate));
                nextDate = new Date(lastDate.getTime() + 24 * 3600 * 1000);
            }

            while (nextDate.getTime() < billingCutoff.getTime()) {
                let unitPrice = 0;
                try {
                    const roomTypeId = booking.room?.roomTypeId;
                    if (roomTypeId) {
                        const rule = await prisma.priceRule.findFirst({
                            where: {
                                entityType: "ROOM_TYPE",
                                entityId: roomTypeId,
                                active: true,
                                validFrom: { lte: nextDate },
                                OR: [{ validUntil: null }, { validUntil: { gte: nextDate } }],
                            },
                            orderBy: { validFrom: "desc" },
                        });
                        if (rule) unitPrice = rule.price;
                    }
                } catch (e) {
                    console.error("priceRule lookup failed", e);
                }

                const isoDate = nextDate.toISOString();

                // Idempotency: check existing BillItem with same reference and chargeDate
                const existingItem = await prisma.billItem.findFirst({
                    where: {
                        referenceType: "ROOM",
                        referenceId: booking.id,
                        chargeDate: nextDate,
                    },
                });
                if (existingItem) {
                    nextDate = new Date(nextDate.getTime() + 24 * 3600 * 1000);
                    continue;
                }

                if (dryRun) {
                    console.log("Would bill", { stayId: s.id, bookingId: booking.id, date: isoDate, amount: unitPrice });
                } else {
                    // find or create bill
                    let bill = null;
                    if (s.admissionId) {
                        bill = await prisma.bill.findFirst({ where: { admissionId: s.admissionId, status: { in: ["DRAFT", "ACTIVE", "PARTIAL"] } } });
                    }
                    if (!bill) {
                        bill = await prisma.bill.create({ data: { patientId: s.patientId ?? undefined, admissionId: s.admissionId ?? undefined, status: "DRAFT" } });
                    }

                    // create bill item recording chargeDate and unitPrice
                    await prisma.billItem.create({
                        data: {
                            billId: bill.id,
                            referenceType: "ROOM",
                            referenceId: booking.id,
                            title: `Room ${booking.room?.name ?? booking.roomId} - ${isoDate.slice(0, 10)}`,
                            quantity: 1,
                            unitPrice: unitPrice,
                            chargeDate: nextDate,
                        },
                    });

                    console.log("Billed", booking.id, isoDate, unitPrice, "to bill", bill.id);
                }

                nextDate = new Date(nextDate.getTime() + 24 * 3600 * 1000);
            }
        } catch (err) {
            console.error("Error billing stay", s.id, err);
        }
    }
}

// schedule
const task = cron.schedule("0 1 * * *", async () => {
    console.log("Starting nightly room billing worker");
    await runRoomBilling();
    console.log("Nightly room billing worker finished");
});

if (require.main === module) {
    (async () => {
        await runRoomBilling(false);
        process.exit(0);
    })();
}
