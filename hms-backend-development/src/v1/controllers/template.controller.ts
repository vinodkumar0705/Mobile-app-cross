import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { apiError } from "../utils/formatter";
import { apiSuccess } from "../utils/formatter";

export interface TemplatesControllerType {
    createPrescriptionTemplate: (req: Request, res: Response) => void;
    getAllPrescriptionTemplates: (req: Request, res: Response) => void;
    getPrescriptionTemplateById: (req: Request, res: Response) => void;
    updatePrescriptionTemplate: (req: Request, res: Response) => void;
    deletePrescriptionTemplate: (req: Request, res: Response) => void;
}

export const TemplatesController: TemplatesControllerType = {
    async createPrescriptionTemplate(req, res) {
        try {
            const user = await prisma.user.findUnique({
                where: {
                    id: req.body.doctorId,
                    isDoctor: true,
                },
            });

            const doc = await prisma.employeeInfo.findUnique({
                where: {
                    userId: req.body.doctorId,
                },
            });
            const { name, title, doctorId, items } = req.body;

            if (!title || !doctorId || !Array.isArray(items) || items.length === 0) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "title, doctorId, valid items required",
                });
            }

            for (const item of items) {
                if (!item.itemId && !item.customMedicineName) {
                    return apiError(res, {
                        statusCode: "BAD_REQUEST",
                        message: "Each item must have itemId or customMedicineName",
                    });
                }
            }

            const template = await prisma.$transaction(async (tx) => {
                return await tx.prescriptionTemplate.create({
                    data: {
                        name,
                        title,
                        doctorId: doc?.id as string,
                        items: {
                            create: items.map((i: any) => ({
                                itemId: i.itemId || null,
                                customMedicineName: i.customMedicineName || null,
                                dosage: i.dosage,
                                frequency: i.frequency,
                                duration: i.duration,
                                timing: i.timing,
                            })),
                        },
                    },
                    include: {
                        items: true,
                    },
                });
            });

            return apiSuccess(res, {
                data: template,
                message: "Template created successfully",
            });
        } catch (err) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to create template",
            });
        }
    },
    async getAllPrescriptionTemplates(req, res) {
        try {
            const userId = req.query.doctorId as string;
            const page = Math.max(1, Number(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

            if (!userId) {
                return apiError(res, { statusCode: "BAD_REQUEST", message: "doctorId is required" });
            }

            // Resolve EmployeeInfo.id from User.id
            const employee = await prisma.employeeInfo.findUnique({
                where: { userId },
            });

            if (!employee) {
                return apiError(res, { statusCode: "NOT_FOUND", message: "Doctor not found" });
            }

            const where = { doctorId: employee.id }; // Use EmployeeInfo.id

            const [result, total] = await prisma.$transaction([
                prisma.prescriptionTemplate.findMany({
                    skip: (page - 1) * limit,
                    take: limit,
                    orderBy: { createdAt: "desc" },
                    where,
                    include: { items: { include: { item: true } } },
                }),
                prisma.prescriptionTemplate.count({ where }),
            ]);

            return apiSuccess(res, {
                data: result,
                metadata: { total, page, limit, doctorId: userId, totalPages: Math.ceil(total / limit) },
                message: "Prescription templates fetched successfully",
            });
        } catch (err) {
            return apiError(res, { statusCode: "INTERNAL_SERVER_ERROR", message: "Unable to fetch templates" });
        }
    },
    async getPrescriptionTemplateById(req, res) {
        try {
            const { id } = req.params;
            const result = await prisma.prescriptionTemplate.findUnique({
                where: { id },
                include: {
                    items: {
                        include: {
                            item: true,
                        },
                    },
                },
            });
            return apiSuccess(res, {
                data: result,
                message: "Prescription template fetched successfully",
            });
        } catch (error) {
            console.error("Error fetching prescription template", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch prescription template",
            });
        }
    },
    async updatePrescriptionTemplate(req, res) {
        try {
            const user = await prisma.user.findUnique({
                where: {
                    id: req.body.doctorId,
                    isDoctor: true,
                },
            });

            const doc = await prisma.employeeInfo.findUnique({
                where: {
                    userId: req.body.doctorId,
                },
            });
            const { id } = req.params;
            const { name, title, doctorId, items } = req.body;

            if (!name || !title || !doctorId || !Array.isArray(items) || items.length === 0) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "name, title, doctorId, valid items required",
                });
            }

            for (const item of items) {
                if (!item.itemId && !item.customMedicineName) {
                    return apiError(res, {
                        statusCode: "BAD_REQUEST",
                        message: "Each item must have itemId or customMedicineName",
                    });
                }
            }

            const result = await prisma.$transaction(async (tx) => {
                const existing = await tx.prescriptionTemplate.findUnique({
                    where: { id },
                });

                if (!existing) {
                    throw new Error("Prescription template not found");
                }

                await tx.prescriptionTemplateItem.deleteMany({
                    where: { templateId: id },
                });

                return await tx.prescriptionTemplate.update({
                    where: { id },
                    data: {
                        name,
                        title,
                        doctorId: doc?.id as string,
                        items: {
                            create: items.map((i: any) => ({
                                itemId: i.itemId || null,
                                customMedicineName: i.customMedicineName || null,
                                dosage: i.dosage,
                                frequency: i.frequency,
                                duration: i.duration,
                                timing: i.timing,
                                notes: i.notes,
                            })),
                        },
                    },
                    include: {
                        items: {
                            include: {
                                item: true,
                            },
                        },
                    },
                });
            });

            return apiSuccess(res, {
                data: result,
                message: "Prescription template updated successfully",
            });
        } catch (error: any) {
            console.error("Error updating prescription template", error);

            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: error?.message || "Unable to update prescription template",
            });
        }
    },
    async deletePrescriptionTemplate(req, res) {
        try {
            const { id } = req.params;

            await prisma.$transaction(async (tx) => {
                await tx.prescriptionTemplateItem.deleteMany({
                    where: { templateId: id },
                });
                await tx.prescriptionTemplate.delete({
                    where: { id },
                });
            });

            return apiSuccess(res, {
                message: "Prescription template deleted successfully",
            });
        } catch (error: any) {
            console.error("Error deleting prescription template", error);

            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: error.message || "Unable to delete prescription template",
            });
        }
    },
};
