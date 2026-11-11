import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { apiError } from "../utils/formatter";
import { apiSuccess } from "../utils/formatter";
import { AppointmentStatus, BillItemType, PhysioTherapyStatus, Prisma, TreatmentStatus } from "@prisma/client";
import { addItemToBill } from "../utils/billing.util";

export interface OPDPatientController {
    addDiet: (req: Request, res: Response) => void;
    createLabOrder: (req: Request, res: Response) => void;
    addTreatment: (req: Request, res: Response) => void;
    addVisit: (req: Request, res: Response) => void;
    addPhysioTherapy: (req: Request, res: Response) => void;
}

export const OPDPatientController: OPDPatientController = {
    async addDiet(req, res) {
        try {
            const { patientId, specialInstructions, dieticianNotes, dieticianName, appointmentId } = req.body;

            if (!patientId) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "patientId is required",
                });
            }
            const result = await prisma.$transaction(
                async (tx) => {
                    const dietRecord = await tx.diet.create({
                        data: {
                            patientId,
                            specialInstructions: specialInstructions,
                            dieticianNotes: dieticianNotes,
                            dieticianName: dieticianName,
                            appointmentId: appointmentId,
                        },
                    });
                    const medicalHistory = await tx.medicalHistory.create({
                        data: {
                            patientId: patientId,
                            dietId: dietRecord.id,
                            appointmentId: appointmentId,
                        },
                    });
                    return dietRecord;
                },
                {
                    maxWait: 60000,
                    timeout: 60000,
                },
            );

            return apiSuccess(res, {
                data: result,
                message: "Diet added successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to add diet",
            });
        }
    },
    async createLabOrder(req, res) {
        try {
            const { patientId, doctorId, testIds, notes, orderDate, status, appointmentId } = req.body;
            if (!doctorId || !patientId || !testIds || !appointmentId) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "appointmentId,doctorId, patientId and testIds are required",
                });
            }
            const result = await prisma.$transaction(
                async (tx) => {
                    const labOrder = await tx.labOrder.create({
                        data: {
                            patientId: patientId,
                            doctorId: String(doctorId),
                            appointmentId: appointmentId,
                            testIds: {
                                connect: testIds.map((testId: string) => ({
                                    id: testId,
                                })),
                            },
                            notes: notes,
                            status: status,
                            orderDate: orderDate ? new Date(orderDate) : new Date(),
                        },
                    });
                    const medicalHistory = await tx.medicalHistory.create({
                        data: {
                            appointmentId: appointmentId,
                            patientId: patientId,
                            labOrderId: labOrder.id,
                        },
                    });

                    // Add each test to the Bill
                    for (const testId of testIds) {
                        await addItemToBill({
                            patientId,
                            entityId: testId,
                            entityType: BillItemType.LAB,
                            tx,
                            billType: "OPD",
                            appointmentId: appointmentId || null,
                        });
                    }

                    return labOrder;
                },
                {
                    maxWait: 60000,
                    timeout: 60000,
                },
            );
            return apiSuccess(res, {
                data: result,
                message: "Lab order created successfully",
            });
        } catch (error) {
            console.error("Error creating lab order:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to create lab order",
            });
        }
    },
    async addTreatment(req: any, res: any) {
        try {
            const { treatmentConfigId, patientId, doctorId, appointmentId, treatmentDate, status, externalDoctorSpecialty, externalDoctor, diagnosis, additionalNotes, medications } = req.body;
            if (!treatmentConfigId || !doctorId || !patientId || !appointmentId) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "treatmentConfigId, doctorId, patientId and appointmentId are required",
                });
            }
            const result = await prisma.$transaction(
                async (tx) => {
                    const treatment = await tx.treatment.create({
                        data: {
                            treatmentConfigId: treatmentConfigId,
                            patientId: patientId,
                            doctorId: doctorId,
                            status: status || TreatmentStatus.IN_PROGRESS,
                            treatmentDate: new Date(treatmentDate),
                            appointmentId: appointmentId,
                            externalDoctor: externalDoctor || "",
                            externalDoctorSpecialty: externalDoctorSpecialty || "",
                            diagnosis: diagnosis || "",
                            additionalNotes: additionalNotes || "",
                            medications: medications || "",
                        },
                    });
                    const medicalHistory = await tx.medicalHistory.create({
                        data: {
                            appointmentId: appointmentId,
                            patientId: patientId,
                            treatmentId: treatment.id,
                        },
                    });

                    // Add to Bill
                    await addItemToBill({
                        patientId,
                        entityId: treatment.id,
                        entityType: BillItemType.TREATMENT,
                        tx,
                        billType: "OPD",
                        appointmentId: appointmentId || null,
                    });

                    return treatment;
                },
                {
                    maxWait: 60000,
                    timeout: 60000,
                },
            );
            return apiSuccess(res, {
                data: result,
                message: "Treatment added successfully",
            });
        } catch (error) {
            console.error("Error adding treatment", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to add treatment",
            });
        }
    },
    async addVisit(req, res) {
        try {
            const { id } = req.params;
            const body = req.body;

            const appointment = await prisma.appointment.findUnique({
                where: { id: id },
            });
            if (!appointment) {
                return res.status(404).json({ message: "Appointment not found" });
            }
            if (appointment.doctorId !== body.doctorId) {
                return res.status(401).json({
                    message: "You are not authorized to access this appointment",
                });
            }
            if (appointment.status !== AppointmentStatus.CONFIRMED) {
                return res.status(400).json({ message: "Appointment is not confirmed" });
            }

            if (!appointment.patientId) {
                return res.status(400).json({ message: "No patient associated with this appointment" });
            }

            const result = await prisma.$transaction(
                async (tx) => {
                    const updatedAppointment = await tx.appointment.update({
                        where: { id: id },
                        data: {
                            status: AppointmentStatus.COMPLETED,
                        },
                    });
                    const createvisit = await tx.visit.create({
                        data: {
                            appointmentId: id,
                            doctorId: body.doctorId,
                            visitDate: body.visitDate ? new Date(body.visitDate) : new Date(),
                            visitType: "OPD",
                            diagnosis: body.diagnosis,
                            examination: body.examination,
                            chiefComplaint: body.chiefComplaint,
                            patientId: appointment.patientId as string,
                            testReportsToCarry: body.testReportsToCarry,
                            nextReviewDate: body.nextReviewDate || null,
                        },
                    });
                    const medicalHistory = await tx.medicalHistory.create({
                        data: {
                            patientId: appointment.patientId as string,
                            visitId: createvisit.id,
                            appointmentId: id,
                        },
                    });
                    return {
                        updatedAppointment,
                        createvisit,
                        medicalHistory,
                    };
                },
                {
                    maxWait: 60000,
                    timeout: 60000,
                },
            );
            return apiSuccess(res, {
                data: result,
                message: "Consultation completed successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to complete consultation",
            });
        }
    },
    async addPhysioTherapy(req, res) {
        try {
            const { patientId, doctorId, appointmentId, status, physioConfigId, notes, sessionDate } = req.body;
            if (!doctorId || !patientId || !sessionDate || !physioConfigId) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "patientId,doctorId, sessionDate and physioConfigId are required",
                });
            }
            const result = await prisma.$transaction(
                async (tx) => {
                    const physioTherapy = await tx.physioTherapy.create({
                        data: {
                            patientId: patientId,
                            appointmentId: appointmentId,
                            doctorId: String(doctorId),
                            physioConfigId: physioConfigId,
                            notes: notes || null,
                            status: status || PhysioTherapyStatus.COMPLETED,
                            sessionDate: new Date(sessionDate) || new Date(),
                        },
                    });
                    await tx.medicalHistory.create({
                        data: {
                            appointmentId: appointmentId ?? null,
                            patientId,
                            physioTherapyId: physioTherapy.id,
                        },
                    });

                    return physioTherapy;
                },
                { maxWait: 60000, timeout: 60000 },
            );

            return apiSuccess(res, {
                data: result,
                message: "Physiotherapy session added successfully",
            });
        } catch (error) {
            console.error("Error adding physiotherapy session:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to add physiotherapy session",
            });
        }
    },
};
