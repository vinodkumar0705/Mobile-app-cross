import cron from "node-cron";
import { prisma } from "../../lib/prisma";
import { sendNotification } from "../utils/twilio";
import {
    followUpReminderPatientMessage,
    followUpReminderDoctorMessage,
    formatDate,
    formatTime,
} from "../utils/whatsappTemplates";

// ─────────────────────────────────────────
// Runs every day at 8:00 AM
// Finds all follow-ups scheduled for tomorrow
// Sends reminders to patient + doctor
// ─────────────────────────────────────────

export const startReminderWorker = () => {
    cron.schedule("0 8 * * *", async () => {
        console.log("[ReminderWorker] Running follow-up reminder job...");

        try {
            // Tomorrow date range
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setHours(23, 59, 59, 999);

            const upcomingFollowUps = await prisma.dischargeSummary.findMany({
                where: {
                    followUpDate: {
                        gte: tomorrow,
                        lte: dayAfterTomorrow,
                    },
                    approvedByDoctor: true,
                },
                include: {
                    // Patient + their User for name & phone
                    patient: {
                        include: {
                            user: {
                                select: {
                                    fName: true,
                                    lName: true,
                                    phoneNumber: true,
                                },
                            },
                        },
                    },
                    // Follow-up doctor (if set) — FollowUpDoctor relation
                    followUpDoctor: {
                        include: {
                            user: {
                                select: {
                                    fName: true,
                                    lName: true,
                                    phoneNumber: true,
                                },
                            },
                        },
                    },
                    // Discharging doctor as fallback — DischargeSummary relation
                    doctor: {
                        include: {
                            user: {
                                select: {
                                    fName: true,
                                    lName: true,
                                    phoneNumber: true,
                                },
                            },
                        },
                    },
                },
            });

            console.log(
                `[ReminderWorker] Found ${upcomingFollowUps.length} follow-up(s) for tomorrow.`
            );

            for (const summary of upcomingFollowUps) {
                try {
                    const patientUser = summary.patient?.user;

                    // PatientInfo.phoneNumber first, fallback to User.phoneNumber
                    const patientPhone =
                        summary.patient?.phoneNumber ?? patientUser?.phoneNumber;

                    const patientName = patientUser
                        ? `${patientUser.fName} ${patientUser.lName}`.trim()
                        : "Patient";

                    const patientAge = summary.patient?.age ?? "N/A";

                    // Use followUpDoctor if assigned, else fall back to discharging doctor
                    const doctorRecord = summary.followUpDoctor ?? summary.doctor;
                    const doctorUser = doctorRecord?.user;
                    const doctorPhone = doctorUser?.phoneNumber;
                    const doctorName = doctorUser
                        ? `${doctorUser.fName} ${doctorUser.lName}`.trim()
                        : "Doctor";

                    const followUpDate = formatDate(new Date(summary.followUpDate!));
                    const followUpTime = formatTime(new Date(summary.followUpDate!));
                    const visitType = "Post-Discharge Follow-Up (IPD)";

                    // 1. Remind Patient
                    if (patientPhone) {
                        await sendNotification(
                            patientPhone,
                            followUpReminderPatientMessage(
                                patientName,
                                followUpDate,
                                followUpTime,
                                doctorName
                            )
                        );
                        console.log(
                            `[ReminderWorker] Patient reminder sent → ${patientName} (${patientPhone})`
                        );
                    } else {
                        console.warn(
                            `[ReminderWorker] No phone found for patient: ${patientName}`
                        );
                    }

                    // 2. Remind Doctor
                    if (doctorPhone) {
                        await sendNotification(
                            doctorPhone,
                            followUpReminderDoctorMessage(
                                doctorName,
                                patientName,
                                patientAge,
                                followUpDate,
                                followUpTime,
                                visitType
                            )
                        );
                        console.log(
                            `[ReminderWorker] Doctor reminder sent → Dr. ${doctorName} (${doctorPhone})`
                        );
                    } else {
                        console.warn(
                            `[ReminderWorker] No phone found for doctor: ${doctorName}`
                        );
                    }
                } catch (innerError) {
                    // One failure should not stop the rest
                    console.error(
                        `[ReminderWorker] Failed for discharge summary ${summary.id}:`,
                        innerError
                    );
                }
            }

            console.log("[ReminderWorker] Follow-up reminder job completed.");
        } catch (error) {
            console.error("[ReminderWorker] Job failed:", error);
        }
    });

    console.log(
        "[ReminderWorker] Cron job registered — runs daily at 8:00 AM."
    );
};