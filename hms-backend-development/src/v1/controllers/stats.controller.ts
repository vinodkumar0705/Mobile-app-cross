import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { apiError } from "../utils/formatter";
import { apiSuccess } from "../utils/formatter";
import { Prisma } from "@prisma/client";

export interface StatsControllerType {
    getOutPatientsStats: (req: Request, res: Response) => void;
    getDoctorAppointmentCount: (req: Request, res: Response) => void;
    getAllCounts: (req: Request, res: Response) => void;
}

export const StatsController: StatsControllerType = {
    getOutPatientsStats: async (req, res) => {
        try {
            const query = req.query;
            const doctorId = query.doctorId as string;

            const startOfToday = new Date();
            startOfToday.setUTCHours(0, 0, 0, 0);

            const endOfToday = new Date();
            endOfToday.setUTCHours(23, 59, 59, 999);

            const where: Prisma.AppointmentWhereInput = {
                appointmentDate: {
                    gte: startOfToday,
                    lte: endOfToday,
                },
                status: {
                    in: ["COMPLETED", "CONFIRMED", "IN_PROGRESS", "CANCELLED"],
                },
            };

            if (doctorId && doctorId.trim() !== "") {
                where.doctorId = {
                    equals: doctorId,
                };
            }
            const stats = await prisma.appointment.groupBy({
                by: ["status"],
                where,

                _count: {
                    status: true,
                },
            });

            const response = {
                completed: 0,
                confirmed: 0,
                inprogress: 0,
                cancelled: 0,
            };
            stats.forEach((item) => {
                if (item.status === "COMPLETED") {
                    response.completed = item._count.status;
                }
                if (item.status === "CONFIRMED") {
                    response.confirmed = item._count.status;
                }
                if (item.status === "IN_PROGRESS") {
                    response.inprogress = item._count.status;
                }
                if (item.status === "CANCELLED") {
                    response.cancelled = item._count.status;
                }
            });
            const total = response.completed + response.confirmed + response.inprogress + response.cancelled;
            const payload = {
                ...response,
                total,
            };
            return apiSuccess(res, { data: payload, message: "Out patients stats fetched successfully" });
        } catch (e) {
            console.error(e);
            return apiError(res, { message: "Something went wrong" });
        }
    },

    getDoctorAppointmentCount: async (req, res) => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return apiError(res, { message: "Unauthorized" });
            }

            // Resolve the logged-in doctor's EmployeeInfo record
            const employeeInfo = await prisma.employeeInfo.findUnique({
                where: { userId },
                select: { id: true },
            });

            if (!employeeInfo) {
                return apiError(res, { message: "Doctor profile not found" });
            }

            const startOfToday = new Date();
            startOfToday.setUTCHours(0, 0, 0, 0);

            const endOfToday = new Date();
            endOfToday.setUTCHours(23, 59, 59, 999);

            // Run both queries in parallel
            const [appointmentStats, admissionStats] = await Promise.all([
                prisma.appointment.groupBy({
                    by: ["status"],
                    where: {
                        doctorId: employeeInfo.id,
                        appointmentDate: {
                            gte: startOfToday,
                            lt: endOfToday,
                        },
                    },
                    _count: { status: true },
                }),
                prisma.admission.groupBy({
                    by: ["status"],
                    where: {
                        admittingDoctorId: employeeInfo.id,
                        admissionDateTime: {
                            gte: startOfToday,
                            lt: endOfToday,
                        },
                    },
                    _count: { status: true },
                }),
            ]);

            // ---- Appointment counts ----
            const appointments = {
                confirmed: 0,
                completed: 0,
            };

            appointmentStats.forEach((item) => {
                const status = item.status;
                const count = item._count.status;

                switch (status) {
                    case "CONFIRMED":
                        appointments.confirmed = count;
                        break;
                    case "COMPLETED":
                        appointments.completed = count;
                        break;
                }
            });

            const appointmentTotal = Object.values(appointments).reduce((sum, count) => sum + count, 0);

            // ---- Admission counts ----
            const admissions = {
                planned: 0,
                admitted: 0,
                dischargeStarted: 0,
            };

            admissionStats.forEach((item) => {
                const status = item.status;
                const count = item._count.status;

                switch (status) {
                    case "PLANNED":
                        admissions.planned = count;
                        break;
                    case "ADMITTED":
                        admissions.admitted = count;
                        break;
                    case "DISCHARGE_STARTED":
                        admissions.dischargeStarted = count;
                        break;
                }
            });

            const admissionTotal = Object.values(admissions).reduce((sum, count) => sum + count, 0);

            return apiSuccess(res, {
                data: {
                    appointments: { ...appointments, total: appointmentTotal },
                    admissions: { ...admissions, total: admissionTotal },
                },
                message: "Doctor stats fetched successfully",
            });
        } catch (e: any) {
            return apiError(res, { message: "Something went wrong", error: e.message });
        }
    },
    getAllCounts: async (req, res) => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return apiError(res, { message: "Unauthorized" });
            }

            const startOfToday = new Date();
            startOfToday.setUTCHours(0, 0, 0, 0);

            const endOfToday = new Date();
            endOfToday.setUTCHours(23, 59, 59, 999);

            // Run both queries in parallel
            const [appointmentStats, admissionStats] = await Promise.all([
                prisma.appointment.groupBy({
                    by: ["status"],
                    where: {
                        appointmentDate: {
                            gte: startOfToday,
                            lt: endOfToday,
                        },
                    },
                    _count: { status: true },
                }),
                prisma.admission.groupBy({
                    by: ["status"],
                    where: {
                        admissionDateTime: {
                            gte: startOfToday,
                            lt: endOfToday,
                        },
                    },
                    _count: { status: true },
                }),
            ]);

            // ---- Appointment counts ----
            const appointments = {
                scheduled: 0,
                confirmed: 0,
                inProgress: 0,
                completed: 0,
                cancelled: 0,
                noShow: 0,
            };

            appointmentStats.forEach((item) => {
                const status = item.status;
                const count = item._count.status;

                switch (status) {
                    case "SCHEDULED":
                        appointments.scheduled = count;
                        break;
                    case "CONFIRMED":
                        appointments.confirmed = count;
                        break;
                    case "IN_PROGRESS":
                        appointments.inProgress = count;
                        break;
                    case "COMPLETED":
                        appointments.completed = count;
                        break;
                    case "CANCELLED":
                        appointments.cancelled = count;
                        break;
                    case "NO_SHOW":
                        appointments.noShow = count;
                        break;
                }
            });

            const appointmentTotal = Object.values(appointments).reduce((sum, count) => sum + count, 0);

            // ---- Admission counts ----
            const admissions = {
                planned: 0,
                admitted: 0,
                dischargeStarted: 0,
                discharged: 0,
                cancelled: 0,
            };

            admissionStats.forEach((item) => {
                const status = item.status;
                const count = item._count.status;

                switch (status) {
                    case "PLANNED":
                        admissions.planned = count;
                        break;
                    case "ADMITTED":
                        admissions.admitted = count;
                        break;
                    case "DISCHARGE_STARTED":
                        admissions.dischargeStarted = count;
                        break;
                    case "DISCHARGED":
                        admissions.discharged = count;
                        break;
                    case "CANCELLED":
                        admissions.cancelled = count;
                        break;
                }
            });

            const admissionTotal = Object.values(admissions).reduce((sum, count) => sum + count, 0);

            return apiSuccess(res, {
                data: {
                    appointments: { ...appointments, total: appointmentTotal },
                    admissions: { ...admissions, total: admissionTotal },
                },
                message: "All stats fetched successfully",
            });
        } catch (e: any) {
            return apiError(res, { message: "Something went wrong", error: e.message });
        }
    },
};
