import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { apiError, apiSuccess } from "../utils/formatter";
import { PriceEntityType, Prisma } from "@prisma/client";

export interface IPricingController {
    getAllPrices: (req: Request, res: Response) => void;
    updatePrice: (req: Request, res: Response) => void;
    createPrice: (req: Request, res: Response) => void;
    getEntityByType: (req: Request, res: Response) => void;
    getBatchesByMedicalItem: (req: Request, res: Response) => void;
}
export const PricingController: IPricingController = {
    async getAllPrices(req, res) {
        try {
            const entityType = req.query.entityType as PriceEntityType;
            const entityId = req.query.entityId as string;
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const where: Prisma.PriceRuleWhereInput = {};
            if (entityType) {
                where.entityType = entityType;
            }
            if (entityId) {
                where.entityId = entityId;
            }
            // await prisma.priceRule.deleteMany({where:{entityType:"DOCTOR_CONSULTATION"}});
            const [prices, total] = await prisma.$transaction([
                prisma.priceRule.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: "desc" },
                }),
                prisma.priceRule.count({ where }),
            ]);

            const today = new Date();

            // Fetch all entities in the current page that have an active temporary price today
            // This is used to determine if a permanent price should be marked as inactive (overridden)
            const entitiesWithActiveTempPrice = new Set(
                (
                    await prisma.priceRule.findMany({
                        where: {
                            validFrom: { lte: today },
                            validUntil: { gte: today }, // This implicitly checks for not null
                            OR: prices.map((p) => ({
                                entityId: p.entityId,
                                entityType: p.entityType,
                            })),
                        },
                        select: { entityId: true, entityType: true },
                    })
                ).map((p) => `${p.entityType}_${p.entityId}`),
            );

            const enrichedPrices = await Promise.all(
                prices.map(async (price) => {
                    let entity: any;
                    switch (price.entityType) {
                        case "DOCTOR_CONSULTATION":
                            entity = await prisma.employeeInfo.findFirst({
                                where: {
                                    id: price.entityId,
                                    user: { isDoctor: true },
                                },
                                include: {
                                    user: true,
                                },
                            });
                            break;
                        case "ROOM_TYPE":
                            entity = await prisma.roomType.findUnique({
                                where: { id: price.entityId },
                            });
                            break;
                        case "SURGERY":
                            entity = await prisma.surgery.findUnique({
                                where: { id: price.entityId },
                            });
                            break;
                        case "LAB":
                            entity = await prisma.labConfiguration.findUnique({
                                where: { id: price.entityId },
                            });

                            break;
                        case "PHARMACY":
                            entity = await prisma.batch.findUnique({
                                where: { id: price.entityId },
                                select: { item: true, batchNumber: true },
                            });
                            break;
                        case "TREATMENT":
                            entity = await prisma.treatmentConfiguration.findUnique({
                                where: { id: price.entityId },
                            });
                            break;
                        case "PHYSIOTHERAPY":
                            entity = await prisma.physioConfiguration.findUnique({
                                where: { id: price.entityId },
                            });
                            break;
                        case "FOOD":
                            entity = await prisma.foodItems.findUnique({
                                where: { id: price.entityId },
                            });
                            break;
                    }

                    // Calculate active status based on dates and priority (ignore DB `active` flag)
                    const isWithinDateRange = price.validFrom <= today && (!price.validUntil || price.validUntil >= today);

                    // Temporary prices (validUntil != null) take priority over permanent ones (validUntil == null)
                    const isOverriddenByTemp = !price.validUntil && entitiesWithActiveTempPrice.has(`${price.entityType}_${price.entityId}`);
                    const isEntityActive = entity?.isActive !== undefined ? entity?.isActive === true : true;

                    const dynamicActive = Boolean(isWithinDateRange && !isOverriddenByTemp && isEntityActive);

                    return { ...price, entity, active: dynamicActive };
                }),
            );
            return apiSuccess(res, {
                data: enrichedPrices,
                message: "Prices fetched successfully",
                metadata: {
                    priceEntityType: Object.values(PriceEntityType),
                    page,
                    limit,
                    total: Number(total),
                    totalPages: Math.ceil(Number(total) / limit) || 1,
                },
            });
        } catch (error) {
            console.error("Error fetching prices", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch prices",
            });
        }
    },
    async updatePrice(req, res) {
        try {
            const { id } = req.params;
            const { price, validFrom, validUntil } = req.body;
            const from = new Date(validFrom);
            const until = validUntil ? new Date(validUntil) : null;

            if (until && until <= from) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "Valid until date must be after valid from date",
                });
            }

            const result = await prisma.$transaction(async (tx) => {
                const existing = await tx.priceRule.findUnique({ where: { id } });
                if (!existing) throw new Error("Price rule not found");

                const entityId = existing.entityId;
                const entityType = existing.entityType as PriceEntityType;

                if (until) {
                    // Temporary price: check for overlaps with other temporary prices (exclude self)
                    const overlappingPrice = await tx.priceRule.findFirst({
                        where: {
                            entityId,
                            entityType,
                            validUntil: { not: null },
                            AND: [{ validFrom: { lte: until } }, { validUntil: { gte: from } }],
                            NOT: { id },
                        },
                    });

                    if (overlappingPrice) {
                        throw new Error(`Price overlaps with an existing temporary price (${overlappingPrice.validFrom.toLocaleDateString()} - ${overlappingPrice.validUntil?.toLocaleDateString()})`);
                    }
                } else {
                    // Permanent price: deactivate other permanent prices for this entity (exclude self)
                    await tx.priceRule.updateMany({
                        where: {
                            entityId,
                            entityType,
                            validUntil: null,
                            NOT: { id },
                        },
                        data: {
                            validUntil: from,
                        },
                    });
                }

                return await tx.priceRule.update({
                    where: { id },
                    data: { price: Number(price), validFrom: from, validUntil: until },
                });
            });
            return apiSuccess(res, {
                data: result,
                message: "Price updated successfully",
            });
        } catch (error) {
            console.error("Error updating price", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to update price",
            });
        }
    },
    async createPrice(req, res) {
        try {
            const { price, entityType, entityId, validFrom, validUntil } = req.body;
            const from = new Date(validFrom);
            const until = validUntil ? new Date(validUntil) : null;

            if (until && until <= from) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "Valid until date must be after valid from date",
                });
            }

            const result = await prisma.$transaction(async (tx) => {
                if (until) {
                    // Temporary price: check for overlaps with other temporary prices
                    const overlappingPrice = await tx.priceRule.findFirst({
                        where: {
                            entityId,
                            entityType,
                            validUntil: { not: null },
                            AND: [{ validFrom: { lte: until } }, { validUntil: { gte: from } }],
                        },
                    });

                    if (overlappingPrice) {
                        throw new Error(`Price overlaps with an existing temporary price (${overlappingPrice.validFrom.toLocaleDateString()} - ${overlappingPrice.validUntil?.toLocaleDateString()})`);
                    }
                } else {
                    // Permanent price: deactivate existing permanent price
                    await tx.priceRule.updateMany({
                        where: {
                            entityId,
                            entityType,
                            validUntil: null,
                        },
                        data: {
                            validUntil: from,
                        },
                    });
                }

                return await tx.priceRule.create({
                    data: {
                        price: Number(price),
                        entityType,
                        entityId,
                        validFrom: from,
                        validUntil: until,
                    },
                });
            });

            return apiSuccess(res, {
                data: result,
                message: "Price created successfully",
            });
        } catch (error: any) {
            console.error("Error creating price", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: error.message || "Unable to create price",
            });
        }
    },
    async getEntityByType(req, res) {
        try {
            const entityType = req.params.entityType as PriceEntityType;
            const search = (req.query.search as string) || "";
            let data: any[] = [];
            switch (entityType) {
                case "DOCTOR_CONSULTATION":
                    data = await prisma.employeeInfo.findMany({
                        where: {
                            user: {
                                isDoctor: true,
                                OR: [
                                    { fName: { contains: search, mode: "insensitive" } },
                                    { lName: { contains: search, mode: "insensitive" } },
                                    { email: { contains: search, mode: "insensitive" } },
                                    { phoneNumber: { contains: search, mode: "insensitive" } },
                                ],
                            },
                        },
                        select: {
                            id: true,
                            user: {
                                select: {
                                    fName: true,
                                    lName: true,
                                },
                            },
                        },
                    });
                    break;
                case "ROOM_TYPE":
                    data = await prisma.roomType.findMany({
                        where: {
                            name: { contains: search, mode: "insensitive" },
                        },
                    });
                    break;
                case "SURGERY":
                    data = await prisma.surgery.findMany({
                        where: {
                            isActive: true,
                            name: { contains: search, mode: "insensitive" },
                        },
                    });
                    break;
                case "LAB":
                    data = await prisma.labConfiguration.findMany({
                        where: {
                            isActive: true,
                            name: { contains: search, mode: "insensitive" },
                        },
                    });
                    break;
                case "PHARMACY":
                    data = await prisma.medicalItem.findMany({
                        where: {
                            name: { contains: search, mode: "insensitive" },
                            batches: {
                                some: {
                                    isActive: true,
                                },
                            },
                        },
                    });
                    break;
                case "TREATMENT":
                    data = await prisma.treatmentConfiguration.findMany({
                        where: {
                            isActive: true,
                            name: { contains: search, mode: "insensitive" },
                        },
                    });
                    break;
                case "PHYSIOTHERAPY":
                    data = await prisma.physioConfiguration.findMany({
                        where: {
                            isActive: true,
                            name: { contains: search, mode: "insensitive" },
                        },
                    });
                    break;
                case "FOOD":
                    data = await prisma.foodItems.findMany({
                        where: {
                            name: { contains: search, mode: "insensitive" },
                        },
                    });
                    break;
            }
            return apiSuccess(res, {
                data: data,
                message: "Entity fetched successfully",
            });
        } catch (error) {
            console.error("Error fetching entity", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch entity",
            });
        }
    },
    async getBatchesByMedicalItem(req, res) {
        try {
            const { medicalItemId } = req.params;
            const batches = await prisma.batch.findMany({
                where: {
                    itemId: medicalItemId,
                    isActive: true,
                },
            });
            return apiSuccess(res, {
                data: batches,
                message: "Batches fetched successfully",
            });
        } catch (error) {
            console.error("Error fetching batches", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch batches",
            });
        }
    },
};
