import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { apiError } from "../utils/formatter";
import { apiSuccess } from "../utils/formatter";
import { Prisma, LabOrderStatus, PriceEntityType, LabResultStatus } from "@prisma/client";
import { getActivePriceAmount } from "../utils/pricing.util";

export interface LabControllerType {
    createLabOrder: (req: Request, res: Response) => void;
    getLabOrders: (req: Request, res: Response) => void;
    getLabOrderById: (req: Request, res: Response) => void;
    getLabOrderByAdmissionId: (req: Request, res: Response) => void;
    getLabOrderByPatientId: (req: Request, res: Response) => void;
    updateLabOrderStatus: (req: Request, res: Response) => void;
    cancelLabOrder: (req: Request, res: Response) => void;
    getLabQueue: (req: Request, res: Response) => void;
    markSampleCollected: (req: Request, res: Response) => void;
    markProcessing: (req: Request, res: Response) => void;
    enterLabValues: (req: Request, res: Response) => void;
    updateLabValues: (req: Request, res: Response) => void;
    getLabResults: (req: Request, res: Response) => void;
    getLabResultById: (req: Request, res: Response) => void;
    verifyLabResult: (req: Request, res: Response) => void;
    finalizeLabResult: (req: Request, res: Response) => void;
    rejectLabResult: (req: Request, res: Response) => void;
    getLabReportById: (req: Request, res: Response) => void;
    getLabReportByPatientId: (req: Request, res: Response) => void;
    getLabReportByAdmissionId: (req: Request, res: Response) => void;
}

// single order
async function enrichOrderWithDynamicPricing(order: any) {
    const testsWithDynamicPrice = await Promise.all(
        order.testIds.map(async (test: any) => {
            const dynamicPrice = await getActivePriceAmount(
                PriceEntityType.LAB,
                test.id
            );
            return { ...test, dynamicPrice };
        })
    );

    const totalPrice = testsWithDynamicPrice.reduce(
        (sum: number, test: any) => sum + test.dynamicPrice,
        0
    );

    return { ...order, testIds: testsWithDynamicPrice, totalPrice };
}

//multiple orders
async function enrichOrdersWithDynamicPricing(orders: any[]) {
    return Promise.all(orders.map(enrichOrderWithDynamicPricing));
}

const labOrderInclude = {
    patient: {
        include: {
            user: {
                select: {
                    id: true,
                    fName: true,
                    lName: true,
                    phoneNumber: true,
                    email: true,
                    bloodGroup: true,
                },
            },
        },
    },
    doctor: {
        include: {
            user: {
                select: {
                    id: true,
                    fName: true,
                    lName: true,
                    phoneNumber: true,
                    email: true,
                },
            },
        },
    },
    testIds: {
        select: {
            id: true,
            name: true,
            category: true,
            duration: true,
            preparationInstructions: true,
            parameters: true,
        },
    },
    visit: {
        select: {
            id: true,
            visitDate: true,
            chiefComplaint: true,
            diagnosis: true,
        },
    },
    labTestResults: {
        include: {
            parameterValues: {
                include: { labParameter: true }
            },
            enteredBy: { include: { user: { select: { id: true, fName: true, lName: true } } } },
            verifiedBy: { include: { user: { select: { id: true, fName: true, lName: true } } } },
        }
    }
};

const labTestResultInclude = {
    patient: {
        include: {
            user: {
                select: {
                    id: true,
                    fName: true,
                    lName: true,
                    phoneNumber: true,
                    email: true,
                    bloodGroup: true,
                },
            },
        },
    },
    doctor: {
        include: {
            user: {
                select: {
                    id: true,
                    fName: true,
                    lName: true,
                    phoneNumber: true,
                    email: true,
                },
            },
        },
    },
    enteredBy: {
        include: {
            user: {
                select: { id: true, fName: true, lName: true },
            },
        },
    },
    verifiedBy: {
        include: {
            user: {
                select: { id: true, fName: true, lName: true },
            },
        },
    },
    parameterValues: {
        include: {
            labParameter: true,
        },
    },
    labOrder: {
        select: {
            id: true,
            status: true,
            orderDate: true,
            notes: true,
        },
    },
    labReport: true,
};

const labReportInclude = {
    labTestResult: {
        include: {
            parameterValues: {
                include: { labParameter: true },
            },
            enteredBy: {
                include: {
                    user: {
                        select: { id: true, fName: true, lName: true },
                    },
                },
            },
            verifiedBy: {
                include: {
                    user: {
                        select: { id: true, fName: true, lName: true },
                    },
                },
            },
            labOrder: {
                select: {
                    id: true,
                    status: true,
                    orderDate: true,
                    notes: true,
                    admissionId: true,
                    visitId: true,
                    testIds: {
                        select: {
                            id: true,
                            name: true,
                            category: true,
                            duration: true,
                            preparationInstructions: true,
                        },
                    },
                },
            },
        },
    },
    patient: {
        include: {
            user: {
                select: {
                    id: true,
                    fName: true,
                    lName: true,
                    phoneNumber: true,
                    email: true,
                    bloodGroup: true,
                },
            },
        },
    },
    validator: {
        include: {
            user: {
                select: { id: true, fName: true, lName: true },
            },
        },
    },
    auditLogs: {
        orderBy: { timestamp: "desc" as const },
        include: {
            changedBy: {
                select: { id: true, fName: true, lName: true },
            },
        },
    },
};

export const LabController: LabControllerType = {

    // createLabOrder
    async createLabOrder(req, res) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user?.id, isDoctor: true },
            });
            const doc = await prisma.employeeInfo.findUnique({
                where: { userId: req.user?.id },
            });

            const { patientId, testIds, notes, orderDate, status, admissionId, visitId } = req.body;

            if (!user?.id || !patientId || !testIds?.length) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "patientId and testIds (non-empty array) are required",
                });
            }

            const result = await prisma.$transaction(async (tx) => {
                const labOrder = await tx.labOrder.create({
                    data: {
                        patientId,
                        doctorId: String(doc?.id),
                        testIds: {
                            connect: testIds.map((testId: string) => ({ id: testId })),
                        },
                        notes,
                        admissionId: admissionId ?? null,
                        visitId: visitId ?? null,
                        status,
                        orderDate: orderDate ? new Date(orderDate) : new Date(),
                    },
                    include: labOrderInclude,
                });

                await tx.medicalHistory.create({
                    data: {
                        admissionId: admissionId ?? null,
                        patientId,
                        labOrderId: labOrder.id,
                    },
                });

                return labOrder;
            }, { maxWait: 60000, timeout: 60000 });

            const enrichedResult = await enrichOrderWithDynamicPricing(result);

            return apiSuccess(res, {
                data: enrichedResult,
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

    // search, status, dateFrom, dateTo, page, limit
    async getLabOrders(req, res) {
        try {
            const {
                search,
                status,
                dateFrom,
                dateTo,
                page = "1",
                limit = "10",
            } = req.query as Record<string, string>;

            const pageNum = Math.max(1, parseInt(page, 10) || 1);
            const limitNum = Math.max(1, parseInt(limit, 10) || 10);
            const skip = (pageNum - 1) * limitNum;

            const filters: Prisma.LabOrderWhereInput[] = [];

            if (status) filters.push({ status: status as LabOrderStatus });

            if (dateFrom || dateTo) {
                const dateFilter: Prisma.DateTimeFilter<"LabOrder"> = {};
                if (dateFrom) dateFilter.gte = new Date(dateFrom);
                if (dateTo) dateFilter.lte = new Date(dateTo);
                filters.push({ orderDate: dateFilter });
            }

            // patient name or phone for search
            if (search) {
                const parts = search.trim().split(" ");
                filters.push({
                    OR: [
                        { patient: { user: { phoneNumber: { contains: search } } } },
                        { patient: { user: { fName: { contains: parts[0], mode: "insensitive" } } } },
                        { patient: { user: { lName: { contains: parts[parts.length - 1], mode: "insensitive" } } } },
                        ...(parts.length >= 2 ? [{
                            AND: [
                                { patient: { user: { fName: { contains: parts[0], mode: "insensitive" as const } } } },
                                { patient: { user: { lName: { contains: parts[1], mode: "insensitive" as const } } } },
                            ]
                        }] : []),
                    ],
                });
            }

            const where: Prisma.LabOrderWhereInput = filters.length ? { AND: filters } : {};

            const [labOrders, total] = await Promise.all([
                prisma.labOrder.findMany({
                    where,
                    skip,
                    take: limitNum,
                    orderBy: { orderDate: "desc" },
                    include: labOrderInclude,
                }),
                prisma.labOrder.count({ where }),
            ]);

            const data = await enrichOrdersWithDynamicPricing(labOrders);

            return apiSuccess(res, {
                data,
                message: "Lab orders fetched successfully",
                metadata: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(total / limitNum),
                    totalItems: total,
                    itemsPerPage: limitNum,
                    hasNextPage: pageNum < Math.ceil(total / limitNum),
                    hasPrevPage: pageNum > 1,
                },
            });
        } catch (error) {
            console.error("Error fetching lab orders:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch lab orders",
            });
        }
    },

    async getLabOrderById(req, res) {
        try {
            const { id } = req.params;

            const labOrder = await prisma.labOrder.findUnique({
                where: { id },
                include: labOrderInclude,
            });

            if (!labOrder) {
                return apiError(res, {
                    statusCode: "NOT_FOUND",
                    message: "Lab order not found",
                });
            }

            const enrichedOrder = await enrichOrderWithDynamicPricing(labOrder);

            return apiSuccess(res, {
                data: enrichedOrder,
                message: "Lab order fetched successfully",
            });
        } catch (error) {
            console.error("Error fetching lab order:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch lab order",
            });
        }
    },

    async getLabOrderByAdmissionId(req, res) {
        try {
            const { admissionId } = req.params;

            if (!admissionId) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "admissionId is required",
                });
            }

            const labOrders = await prisma.labOrder.findMany({
                where: { admissionId },
                orderBy: { orderDate: "desc" },
                include: labOrderInclude,
            });

            const enrichedOrders = await enrichOrdersWithDynamicPricing(labOrders);

            return apiSuccess(res, {
                data: enrichedOrders,
                message: "Lab orders fetched successfully",
            });
        } catch (error) {
            console.error("Error fetching lab orders by admissionId:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch lab orders",
            });
        }
    },

    async getLabOrderByPatientId(req, res) {
        try {
            const { patientId } = req.params;

            if (!patientId) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "patientId is required",
                });
            }

            const labOrders = await prisma.labOrder.findMany({
                where: { patientId },
                orderBy: { orderDate: "desc" },
                include: labOrderInclude,
            });

            const enrichedOrders = await enrichOrdersWithDynamicPricing(labOrders);

            return apiSuccess(res, {
                data: enrichedOrders,
                message: "Lab orders fetched successfully",
            });
        } catch (error) {
            console.error("Error fetching lab orders by patientId:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch lab orders",
            });
        }
    },

    async updateLabOrderStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!status) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "status is required",
                });
            }

            const validTransitions: Record<string, string[]> = {
                PENDING: ["COLLECTED", "CANCELLED"],
                COLLECTED: ["PROCESSING", "CANCELLED"],
                PROCESSING: ["COMPLETED", "CANCELLED"],
                COMPLETED: [],
                CANCELLED: [],
            };

            const existing = await prisma.labOrder.findUnique({ where: { id } });

            if (!existing) {
                return apiError(res, {
                    statusCode: "NOT_FOUND",
                    message: "Lab order not found",
                });
            }

            const allowed = validTransitions[existing.status] ?? [];
            if (!allowed.includes(status)) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: `Cannot transition from ${existing.status} to ${status}`,
                });
            }

            const updated = await prisma.labOrder.update({
                where: { id },
                data: { status },
                include: labOrderInclude,
            });

            return apiSuccess(res, {
                data: updated,
                message: `Lab order status updated to ${status}`,
            });
        } catch (error) {
            console.error("Error updating lab order status:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to update lab order status",
            });
        }
    },

    async cancelLabOrder(req, res) {
        try {
            const { id } = req.params;

            const existing = await prisma.labOrder.findUnique({ where: { id } });

            if (!existing) {
                return apiError(res, {
                    statusCode: "NOT_FOUND",
                    message: "Lab order not found",
                });
            }

            if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: `Cannot cancel a lab order with status ${existing.status}`,
                });
            }

            const cancelled = await prisma.labOrder.update({
                where: { id },
                data: { status: "CANCELLED" },
                include: labOrderInclude,
            });

            return apiSuccess(res, {
                data: cancelled,
                message: "Lab order cancelled successfully",
            });
        } catch (error) {
            console.error("Error cancelling lab order:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to cancel lab order",
            });
        }
    },

    // Returns PENDING, COLLECTED, PROCESSING orders for the lab queue
    async getLabQueue(req, res) {
        try {
            const {
                search,
                status,
                page = "1",
                limit = "10",
            } = req.query as Record<string, string>;

            const pageNum = Math.max(1, parseInt(page, 10) || 1);
            const limitNum = Math.max(1, parseInt(limit, 10) || 10);
            const skip = (pageNum - 1) * limitNum;

            const filters: Prisma.LabOrderWhereInput[] = [
                {
                    status: status
                        ? (status as LabOrderStatus)
                        : { notIn: ["COMPLETED", "CANCELLED"] },
                },
            ];

            if (search) {
                const parts = search.trim().split(" ");
                filters.push({
                    OR: [
                        { patient: { user: { phoneNumber: { contains: search } } } },
                        { patient: { user: { fName: { contains: parts[0], mode: "insensitive" } } } },
                        { patient: { user: { lName: { contains: parts[parts.length - 1], mode: "insensitive" } } } },
                        ...(parts.length >= 2 ? [{
                            AND: [
                                { patient: { user: { fName: { contains: parts[0], mode: "insensitive" as const } } } },
                                { patient: { user: { lName: { contains: parts[1], mode: "insensitive" as const } } } },
                            ],
                        }] : []),
                    ],
                });
            }

            const where: Prisma.LabOrderWhereInput = { AND: filters };

            const [labOrders, total] = await Promise.all([
                prisma.labOrder.findMany({
                    where,
                    skip,
                    take: limitNum,
                    orderBy: { orderDate: "asc" }, // oldest first for queue
                    include: {
                        ...labOrderInclude,
                        labTestResults: {
                            select: {
                                id: true,
                                status: true,
                                enteredById: true,
                                verifiedById: true,
                                finalizedAt: true,
                            },
                        },
                    },
                }),
                prisma.labOrder.count({ where }),
            ]);

            const data = await enrichOrdersWithDynamicPricing(labOrders);

            return apiSuccess(res, {
                data,
                message: "Lab queue fetched successfully",
                metadata: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(total / limitNum),
                    totalItems: total,
                    itemsPerPage: limitNum,
                    hasNextPage: pageNum < Math.ceil(total / limitNum),
                    hasPrevPage: pageNum > 1,
                },
            });
        } catch (error) {
            console.error("Error fetching lab queue:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch lab queue",
            });
        }
    },

    // PENDING → COLLECTED
    async markSampleCollected(req, res) {
        try {
            const { id } = req.params;

            const existing = await prisma.labOrder.findUnique({ where: { id } });

            if (!existing) {
                return apiError(res, {
                    statusCode: "NOT_FOUND",
                    message: "Lab order not found",
                });
            }

            if (existing.status !== "PENDING") {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: `Sample can only be collected from PENDING orders. Current status: ${existing.status}`,
                });
            }

            const updated = await prisma.labOrder.update({
                where: { id },
                data: { status: "COLLECTED" },
                include: labOrderInclude,
            });

            const enrichedOrder = await enrichOrderWithDynamicPricing(updated);

            return apiSuccess(res, {
                data: enrichedOrder,
                message: "Sample marked as collected",
            });
        } catch (error) {
            console.error("Error marking sample collected:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to mark sample as collected",
            });
        }
    },

    // COLLECTED → PROCESSING
    async markProcessing(req, res) {
        try {
            const { id } = req.params;

            const existing = await prisma.labOrder.findUnique({ where: { id } });

            if (!existing) {
                return apiError(res, {
                    statusCode: "NOT_FOUND",
                    message: "Lab order not found",
                });
            }

            if (existing.status !== "COLLECTED") {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: `Order must be COLLECTED before processing. Current status: ${existing.status}`,
                });
            }

            const updated = await prisma.labOrder.update({
                where: { id },
                data: { status: "PROCESSING" },
                include: labOrderInclude,
            });

            const enrichedOrder = await enrichOrderWithDynamicPricing(updated);

            return apiSuccess(res, {
                data: enrichedOrder,
                message: "Lab order marked as processing",
            });
        } catch (error) {
            console.error("Error marking lab order as processing:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to mark lab order as processing",
            });
        }
    },

    // Creates LabTestResult + TestParameterValues for an order
    // Body: { remarks?, parameterValues: [{ labParameterId, value, unit?, referenceRange?, isAbnormal?, remarks?, attachmentUrl? }] }
    async enterLabValues(req, res) {
        try {
            const { id } = req.params; // labOrderId
            const { remarks, parameterValues } = req.body;

            if (!parameterValues?.length) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "parameterValues (non-empty array) is required",
                });
            }

            const labOrder = await prisma.labOrder.findUnique({
                where: { id },
                include: { labTestResults: true },
            });

            if (!labOrder) {
                return apiError(res, {
                    statusCode: "NOT_FOUND",
                    message: "Lab order not found",
                });
            }

            if (labOrder.status === "PENDING") {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "Sample must be collected before entering values",
                });
            }

            if (labOrder.status === "CANCELLED" || labOrder.status === "COMPLETED") {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: `Cannot enter values for a ${labOrder.status} order`,
                });
            }

            if (labOrder.labTestResults.length > 0) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "Values already entered for this order. Use update instead.",
                });
            }

            const employee = await prisma.employeeInfo.findUnique({
                where: { userId: req.user?.id },
            });

            const result = await prisma.$transaction(async (tx) => {
                const labTestResult = await tx.labTestResult.create({
                    data: {
                        labOrderId: id,
                        patientId: labOrder.patientId,
                        doctorId: labOrder.doctorId,
                        status: "ENTERED",
                        remarks: remarks ?? null,
                        enteredById: employee?.id ?? null,
                        parameterValues: {
                            create: parameterValues.map((pv: {
                                labParameterId: string;
                                value: string;
                                unit?: string;
                                referenceRange?: string;
                                isAbnormal?: boolean;
                                remarks?: string;
                                attachmentUrl?: string;
                            }) => ({
                                labParameterId: pv.labParameterId,
                                value: pv.value,
                                unit: pv.unit ?? null,
                                referenceRange: pv.referenceRange ?? null,
                                isAbnormal: pv.isAbnormal ?? false,
                                remarks: pv.remarks ?? null,
                                attachmentUrl: pv.attachmentUrl ?? null,
                            })),
                        },
                    },
                    include: {
                        parameterValues: {
                            include: { labParameter: true },
                        },
                        enteredBy: {
                            include: {
                                user: {
                                    select: { id: true, fName: true, lName: true },
                                },
                            },
                        },
                    },
                });

                // Auto-advance to PROCESSING if still COLLECTED
                if (labOrder.status === "COLLECTED") {
                    await tx.labOrder.update({
                        where: { id },
                        data: { status: "PROCESSING" },
                    });
                }

                await tx.medicalHistory.create({
                    data: {
                        patientId: labOrder.patientId,
                        labOrderId: id,
                        labTestResultId: labTestResult.id,
                        admissionId: labOrder.admissionId ?? null,
                    },
                });

                return labTestResult;
            }, { maxWait: 60000, timeout: 60000 });

            return apiSuccess(res, {
                data: result,
                message: "Lab values entered successfully",
            });
        } catch (error) {
            console.error("Error entering lab values:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to enter lab values",
            });
        }
    },

    // Updates existing TestParameterValues — only allowed in ENTERED status
    // Body: { remarks?, parameterValues: [{ labParameterId, value, unit?, referenceRange?, isAbnormal?, remarks?, attachmentUrl? }] }
    async updateLabValues(req, res) {
        try {
            const { id } = req.params; // labOrderId
            const { remarks, parameterValues } = req.body;

            const labTestResult = await prisma.labTestResult.findFirst({
                where: { labOrderId: id },
                include: { parameterValues: true },
            });

            if (!labTestResult) {
                return apiError(res, {
                    statusCode: "NOT_FOUND",
                    message: "No lab result found for this order. Use enter values first.",
                });
            }

            if (labTestResult.status !== "ENTERED") {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: `Values can only be updated in ENTERED status. Current status: ${labTestResult.status}`,
                });
            }

            const updated = await prisma.$transaction(async (tx) => {
                for (const pv of parameterValues) {
                    await tx.testParameterValue.updateMany({
                        where: {
                            labTestResultId: labTestResult.id,
                            labParameterId: pv.labParameterId,
                        },
                        data: {
                            value: pv.value,
                            unit: pv.unit ?? undefined,
                            referenceRange: pv.referenceRange ?? undefined,
                            isAbnormal: pv.isAbnormal ?? undefined,
                            remarks: pv.remarks ?? undefined,
                            attachmentUrl: pv.attachmentUrl ?? undefined,
                        },
                    });
                }

                return tx.labTestResult.update({
                    where: { id: labTestResult.id },
                    data: { remarks: remarks ?? labTestResult.remarks },
                    include: {
                        parameterValues: {
                            include: { labParameter: true },
                        },
                        enteredBy: {
                            include: {
                                user: {
                                    select: { id: true, fName: true, lName: true },
                                },
                            },
                        },
                    },
                });
            }, { maxWait: 60000, timeout: 60000 });

            return apiSuccess(res, {
                data: updated,
                message: "Lab values updated successfully",
            });
        } catch (error) {
            console.error("Error updating lab values:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to update lab values",
            });
        }
    },

    // Returns all LabTestResults — supports: status, search, page, limit
    async getLabResults(req, res) {
        try {
            const {
                search,
                status,
                page = "1",
                limit = "10",
            } = req.query as Record<string, string>;

            const pageNum = Math.max(1, parseInt(page, 10) || 1);
            const limitNum = Math.max(1, parseInt(limit, 10) || 10);
            const skip = (pageNum - 1) * limitNum;

            const filters: Prisma.LabTestResultWhereInput[] = [];

            if (status) {
                filters.push({ status: status as LabResultStatus });
            } else {
                // Default: exclude FINALIZED and CANCELLED
                filters.push({ status: { notIn: ["FINALIZED", "CANCELLED"] } });
            }

            if (search) {
                const parts = search.trim().split(" ");
                filters.push({
                    OR: [
                        { patient: { user: { phoneNumber: { contains: search } } } },
                        { patient: { user: { fName: { contains: parts[0], mode: "insensitive" } } } },
                        { patient: { user: { lName: { contains: parts[parts.length - 1], mode: "insensitive" } } } },
                        ...(parts.length >= 2 ? [{
                            AND: [
                                { patient: { user: { fName: { contains: parts[0], mode: "insensitive" as const } } } },
                                { patient: { user: { lName: { contains: parts[1], mode: "insensitive" as const } } } },
                            ],
                        }] : []),
                    ],
                });
            }

            const where: Prisma.LabTestResultWhereInput = filters.length ? { AND: filters } : {};

            const [labResults, total] = await Promise.all([
                prisma.labTestResult.findMany({
                    where,
                    skip,
                    take: limitNum,
                    orderBy: { testDate: "desc" },
                    include: labTestResultInclude,
                }),
                prisma.labTestResult.count({ where }),
            ]);

            return apiSuccess(res, {
                data: labResults,
                message: "Lab results fetched successfully",
                metadata: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(total / limitNum),
                    totalItems: total,
                    itemsPerPage: limitNum,
                    hasNextPage: pageNum < Math.ceil(total / limitNum),
                    hasPrevPage: pageNum > 1,
                },
            });
        } catch (error) {
            console.error("Error fetching lab results:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch lab results",
            });
        }
    },

    async getLabResultById(req, res) {
        try {
            const { id } = req.params;

            const labResult = await prisma.labTestResult.findUnique({
                where: { id },
                include: labTestResultInclude,
            });

            if (!labResult) {
                return apiError(res, {
                    statusCode: "NOT_FOUND",
                    message: "Lab result not found",
                });
            }

            return apiSuccess(res, {
                data: labResult,
                message: "Lab result fetched successfully",
            });
        } catch (error) {
            console.error("Error fetching lab result:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch lab result",
            });
        }
    },

    // ENTERED → VERIFIED
    async verifyLabResult(req, res) {
        try {
            const { id } = req.params; // labTestResultId
            const { remarks } = req.body;

            const existing = await prisma.labTestResult.findUnique({ where: { id } });

            if (!existing) {
                return apiError(res, {
                    statusCode: "NOT_FOUND",
                    message: "Lab result not found",
                });
            }

            if (existing.status !== "ENTERED") {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: `Only ENTERED results can be verified. Current status: ${existing.status}`,
                });
            }

            const supervisor = await prisma.employeeInfo.findUnique({
                where: { userId: req.user?.id },
            });

            const updated = await prisma.labTestResult.update({
                where: { id },
                data: {
                    status: "VERIFIED",
                    verifiedById: supervisor?.id ?? null,
                    remarks: remarks ?? existing.remarks,
                },
                include: labTestResultInclude,
            });

            return apiSuccess(res, {
                data: updated,
                message: "Lab result verified successfully",
            });
        } catch (error) {
            console.error("Error verifying lab result:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to verify lab result",
            });
        }
    },

    // VERIFIED → FINALIZED → creates LabReport + audit log + marks LabOrder COMPLETED
    async finalizeLabResult(req, res) {
        try {
            const { id } = req.params; // labTestResultId
            const { remarks } = req.body;

            const existing = await prisma.labTestResult.findUnique({
                where: { id },
                include: { labReport: true },
            });

            if (!existing) {
                return apiError(res, {
                    statusCode: "NOT_FOUND",
                    message: "Lab result not found",
                });
            }

            if (existing.status !== "VERIFIED") {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: `Only VERIFIED results can be finalized. Current status: ${existing.status}`,
                });
            }

            const supervisor = await prisma.employeeInfo.findUnique({
                where: { userId: req.user?.id },
            });

            const result = await prisma.$transaction(async (tx) => {
                // Finalize the result
                const finalizedResult = await tx.labTestResult.update({
                    where: { id },
                    data: {
                        status: "FINALIZED",
                        finalizedAt: new Date(),
                        verifiedById: supervisor?.id ?? null,
                        remarks: remarks ?? existing.remarks,
                    },
                    include: labTestResultInclude,
                });

                // Create LabReport
                const labReport = await tx.labReport.create({
                    data: {
                        labTestResultId: id,
                        patientId: existing.patientId,
                        validatorId: supervisor?.id ?? null,
                        finalizedDate: new Date(),
                        status: "FINALIZED",
                        versionNumber: 1,
                    },
                });

                // Create audit log
                await tx.labReportAudit.create({
                    data: {
                        labReportId: labReport.id,
                        changedById: req.user?.id as string,
                        action: "FINALIZED",
                        oldStatus: "VERIFIED",
                        newStatus: "FINALIZED",
                        remarks: remarks ?? null,
                    },
                });

                // Mark LabOrder as COMPLETED
                await tx.labOrder.update({
                    where: { id: existing.labOrderId },
                    data: { status: "COMPLETED" },
                });

                return finalizedResult;
            }, { maxWait: 60000, timeout: 60000 });

            return apiSuccess(res, {
                data: result,
                message: "Lab result finalized successfully",
            });
        } catch (error) {
            console.error("Error finalizing lab result:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to finalize lab result",
            });
        }
    },

    // VERIFIED or ENTERED → back to ENTERED with remarks
    async rejectLabResult(req, res) {
        try {
            const { id } = req.params;
            const { remarks } = req.body;

            if (!remarks) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "remarks are required when rejecting a result",
                });
            }

            const existing = await prisma.labTestResult.findUnique({
                where: { id },
                include: { labReport: true },
            });

            if (!existing) {
                return apiError(res, {
                    statusCode: "NOT_FOUND",
                    message: "Lab result not found",
                });
            }

            if (!["ENTERED", "VERIFIED"].includes(existing.status)) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: `Only ENTERED or VERIFIED results can be rejected. Current status: ${existing.status}`,
                });
            }

            const result = await prisma.$transaction(async (tx) => {
                const rejected = await tx.labTestResult.update({
                    where: { id },
                    data: {
                        status: "ENTERED",
                        verifiedById: null,
                        remarks,
                    },
                    include: labTestResultInclude,
                });

                // If a report exists, create audit log for rejection
                if (existing.labReport) {
                    await tx.labReportAudit.create({
                        data: {
                            labReportId: existing.labReport.id,
                            changedById: req.user?.id as string,
                            action: "REJECTED",
                            oldStatus: existing.status as LabResultStatus,
                            newStatus: "ENTERED",
                            remarks,
                        },
                    });
                }

                return rejected;
            }, { maxWait: 60000, timeout: 60000 });

            return apiSuccess(res, {
                data: result,
                message: "Lab result rejected and sent back for re-entry",
            });
        } catch (error) {
            console.error("Error rejecting lab result:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to reject lab result",
            });
        }
    },

    // getLabReportById
    async getLabReportById(req, res) {
        try {
            const { id } = req.params;

            const labReport = await prisma.labReport.findUnique({
                where: { id },
                include: labReportInclude,
            });

            if (!labReport) {
                return apiError(res, {
                    statusCode: "NOT_FOUND",
                    message: "Lab report not found",
                });
            }

            return apiSuccess(res, {
                data: labReport,
                message: "Lab report fetched successfully",
            });
        } catch (error) {
            console.error("Error fetching lab report:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch lab report",
            });
        }
    },

    // getLabReportByPatientId
    // supports: page, limit, dateFrom, dateTo
    async getLabReportByPatientId(req, res) {
        try {
            const { patientId } = req.params;
            const {
                page = "1",
                limit = "10",
                dateFrom,
                dateTo,
            } = req.query as Record<string, string>;

            if (!patientId) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "patientId is required",
                });
            }

            const pageNum = Math.max(1, parseInt(page, 10) || 1);
            const limitNum = Math.max(1, parseInt(limit, 10) || 10);
            const skip = (pageNum - 1) * limitNum;

            const filters: Prisma.LabReportWhereInput[] = [
                { patientId },
            ];

            if (dateFrom || dateTo) {
                const dateFilter: Prisma.DateTimeFilter<"LabReport"> = {};
                if (dateFrom) dateFilter.gte = new Date(dateFrom);
                if (dateTo) dateFilter.lte = new Date(dateTo);
                filters.push({ finalizedDate: dateFilter });
            }

            const where: Prisma.LabReportWhereInput = { AND: filters };

            const [labReports, total] = await Promise.all([
                prisma.labReport.findMany({
                    where,
                    skip,
                    take: limitNum,
                    orderBy: { finalizedDate: "desc" },
                    include: labReportInclude,
                }),
                prisma.labReport.count({ where }),
            ]);

            return apiSuccess(res, {
                data: labReports,
                message: "Lab reports fetched successfully",
                metadata: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(total / limitNum),
                    totalItems: total,
                    itemsPerPage: limitNum,
                    hasNextPage: pageNum < Math.ceil(total / limitNum),
                    hasPrevPage: pageNum > 1,
                },
            });
        } catch (error) {
            console.error("Error fetching lab reports by patientId:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch lab reports",
            });
        }
    },

    // getLabReportByAdmissionId
    async getLabReportByAdmissionId(req, res) {
        try {
            const { admissionId } = req.params;

            if (!admissionId) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "admissionId is required",
                });
            }

            const labReports = await prisma.labReport.findMany({
                where: {
                    labTestResult: {
                        labOrder: { admissionId },
                    },
                },
                orderBy: { finalizedDate: "desc" },
                include: labReportInclude,
            });

            return apiSuccess(res, {
                data: labReports,
                message: "Lab reports fetched successfully",
            });
        } catch (error) {
            console.error("Error fetching lab reports by admissionId:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch lab reports",
            });
        }
    },
};