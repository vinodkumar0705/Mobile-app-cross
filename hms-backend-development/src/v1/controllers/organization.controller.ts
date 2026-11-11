import { Request, Response } from "express";
import { apiError, apiResponse } from "../utils/formatter";
import { prisma } from "@/lib/prisma";
import * as schemas from "../validators/organization.validator";
import { Prisma, PriceEntityType } from "@prisma/client";
import { DateTime } from "luxon";
import { deletePrices, getActivePriceAmount, upsertPriceRule } from "../utils/pricing.util";

/**
 * Mapping of generic resource names to PriceEntityType.
 * Used for dynamic price injection and updates.
 */
const PriceEntityMap: Record<string, PriceEntityType> = {
    "room-types": PriceEntityType.ROOM_TYPE,
    surgery: PriceEntityType.SURGERY,
    labConfiguration: PriceEntityType.LAB,
    treatmentConfiguration: PriceEntityType.TREATMENT,
    physioConfiguration: PriceEntityType.PHYSIOTHERAPY,
};

/**
 * Model Map for Dynamic Resource Handling
 * Maps the URL resource parameter to the corresponding Prisma model and schema
 */
const ModelMap: Record<string, { model: any; schema: any; select?: any; include?: any; modelName: string }> = {
    organization: {
        model: prisma.organization,
        modelName: "organization",
        schema: schemas.organizationSchema,
        include: {
            _count: {
                select: {
                    branches: true,
                },
            },
        } as Prisma.BranchInclude,
    },
    branches: {
        model: prisma.branch,
        modelName: "branch",
        schema: schemas.branchSchema,
        include: {
            _count: {
                select: {
                    buildings: true,
                },
            },
        } as Prisma.BranchInclude,
    },
    buildings: {
        model: prisma.building,
        modelName: "building",
        schema: schemas.buildingSchema,
        select: {
            id: true,
            name: true,
            branch: {
                select: {
                    id: true,
                    name: true,
                },
            },
            _count: {
                select: {
                    floor: true,
                },
            },
        } as Prisma.BuildingSelect,
    },
    floors: {
        model: prisma.floor,
        modelName: "floor",
        schema: schemas.floorSchema,
        select: {
            id: true,
            name: true,
            building: {
                select: {
                    id: true,
                    name: true,
                },
            },
            _count: {
                select: {
                    room: true,
                },
            },
        } as Prisma.FloorSelect,
    },
    rooms: {
        model: prisma.room,
        modelName: "room",
        schema: schemas.roomSchema,
        select: {
            id: true,
            name: true,
            amenities: {
                select: {
                    id: true,
                    name: true,
                    icon: true,
                },
            },
            capacity: true,
            roomNumber: true,
            floor: {
                select: {
                    id: true,
                    name: true,
                },
            },
            roomType: {
                select: {
                    id: true,
                    name: true,
                },
            },
            currentOccupancy: true,
        } as Prisma.RoomSelect,
    },
    "room-types": {
        model: prisma.roomType,
        modelName: "roomType",
        schema: schemas.roomTypeSchema,
        select: {
            id: true,
            name: true,
            description: true,
            _count: {
                select: {
                    room: true,
                },
            },
        } as Prisma.RoomTypeSelect,
    },
    amenity: {
        model: (prisma as any).amenity,
        modelName: "amenity",
        schema: schemas.amenitySchema,
        include: {
            _count: {
                select: {
                    room: true,
                },
            },
        } as Prisma.AmenityInclude,
    },
    departments: {
        model: prisma.department,
        modelName: "department",
        schema: schemas.departmentSchema,
        include: {
            _count: {
                select: {
                    employees: true,
                    speciality: true,
                },
            },
        } as Prisma.DepartmentInclude,
    },
    speciality: {
        model: prisma.speciality,
        modelName: "speciality",
        schema: schemas.specialitySchema,
    },
    surgery: {
        model: prisma.surgery,
        modelName: "surgery",
        schema: schemas.surgerySchema,
        select: {
            id: true,
            name: true,
            description: true,
            duration: true,
            status: true,
        } as Prisma.SurgerySelect,
    },
    treatmentConfiguration: {
        model: prisma.treatmentConfiguration,
        modelName: "treatmentConfiguration",
        schema: schemas.treatmentConfigurationSchema,
        select: {
            id: true,
            name: true,
            description: true,
            status: true,
            isActive: true,
        } as Prisma.TreatmentConfigurationSelect,
    },
    physioConfiguration: {
        model: prisma.physioConfiguration,
        modelName: "physioConfiguration",
        schema: schemas.physioConfigurationSchema,
        select: {
            id: true,
            name: true,
            description: true,
            status: true,
            duration: true,
            time: true,
            sets: true,
            reps: true,
            difficultyLevel: true,
            isActive: true,
        } as Prisma.PhysioConfigurationSelect,
    },
    labConfiguration: {
        model: prisma.labConfiguration,
        modelName: "labConfiguration",
        schema: schemas.labConfigurationSchema,
        select: {
            id: true,
            name: true,
            description: true,
            category: true,
            duration: true,
            preparationInstructions: true,
            reportType: true,
            parameters: true,
            isActive: true,
        } as Prisma.LabConfigurationSelect,
    },
    referralUsers: {
        model: prisma.referralUsers,
        modelName: "referralUsers",
        schema: schemas.referralUsersSchema,
        include: {
            referralEmployee: {
                select: {
                    id: true,
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
        },
    },
};
function generateTimeSlots(startTime: string, endTime: string, duration: number, timezone: string | null) {
    const todayOrg = DateTime.now()
        .setZone(timezone || "UTC")
        .toISODate();

    let start = DateTime.fromISO(`${todayOrg}T${startTime}`, {
        zone: timezone || "UTC",
    });
    const end = DateTime.fromISO(`${todayOrg}T${endTime}`, {
        zone: timezone || "UTC",
    });

    const interval = duration; // minutes
    let count = 1;
    const timeSlots = [];

    while (start.plus({ minutes: interval }) <= end) {
        const slotStart = start;
        const slotEnd = start.plus({ minutes: interval });

        timeSlots.push({
            order: count,
            startTime: slotStart.toUTC().toJSDate(),
            endTime: slotEnd.toUTC().toJSDate(),
        });

        start = start.plus({ minutes: interval });
        count++;
    }

    return timeSlots;
}

export const OrganizationController = {
    // Generic Resource Handlers
    updateTimeSlots: async (req: Request, res: Response) => {
        try {
            const { organizationId } = req.params;
            const { opdStartTime, opdEndTime, opdDuration } = req.body;
            const organization = await prisma.organization.findUnique({
                where: { id: organizationId },
            });
            if (!organization) return res.status(404).json({ message: "Organization not found." });
            await prisma.$transaction(async (tx) => {
                await tx.organization.update({
                    where: { id: organizationId },
                    data: {
                        opdStartTime,
                        opdEndTime,
                        opdDuration,
                    },
                });
                await tx.timeSlot.deleteMany();
                const timeSlots = generateTimeSlots(opdStartTime, opdEndTime, opdDuration, organization.timezone);
                await tx.timeSlot.createMany({
                    data: timeSlots,
                });
                return;
            });
            return apiResponse(res, {
                data: {},
                message: "Organization updated successfully.",
            });
        } catch (error) {
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    handleGenericGet: async (req: Request, res: Response) => {
        try {
            const { resource } = req.params;
            const entry = ModelMap[resource];
            if (!entry) return res.status(404).json({ message: "Invalid resource type." });

            const filters = req.query;
            const data = await entry.model.findMany({
                where: filters,
                ...(entry.select && { select: entry.select }),
                ...(entry.include && { include: entry.include }),
            });

            const enrichedData = await Promise.all(
                data.map(async (item: any) => {
                    const entityType = PriceEntityMap[resource];
                    if (entityType) {
                        item.price = await getActivePriceAmount(entityType, item.id);
                    }
                    return item;
                }),
            );

            return apiResponse(res, {
                data: enrichedData,
                message: `${resource} fetched successfully.`,
            });
        } catch (error) {
            console.error(`Error fetching ${req.params.resource}:`, error);
            return apiError(res, {
                message: `Failed to fetch ${req.params.resource}.`,
            });
        }
    },
    handleGenericGetById: async (req: Request, res: Response) => {
        try {
            const { resource, id } = req.params;
            const entry = ModelMap[resource];
            if (!entry) return res.status(404).json({ message: "Invalid resource type." });

            const filters = req.query;
            const data = await entry.model.findUnique({
                where: { id },
                ...(entry.select && { select: entry.select }),
                ...(entry.include && { include: entry.include }),
            });

            if (data) {
                const entityType = PriceEntityMap[resource];
                if (entityType) {
                    (data as any).price = await getActivePriceAmount(entityType, id);
                }
            }

            return apiResponse(res, {
                data,
                message: `${resource} fetched successfully.`,
            });
        } catch (error) {
            console.error(`Error fetching ${req.params.resource}:`, error);
            return apiError(res, {
                message: `Failed to fetch ${req.params.resource}.`,
            });
        }
    },

    handleGenericAdd: async (req: Request, res: Response) => {
        try {
            const { resource } = req.params;
            const entry = ModelMap[resource];
            if (!entry) return res.status(404).json({ message: "Invalid resource type." });

            // Validate body using the schema from ModelMap
            const validatedData = entry.schema.parse(req.body);

            // Models that need unique name check
            const modelsWithUniqueName = ["branches", "buildings", "floors", "room-types", "departments", "amenity", "surgery", "treatmentConfiguration", "physioConfiguration", "labConfiguration"];

            // Only check name for these specific models
            if (modelsWithUniqueName.includes(resource) && validatedData.name) {
                const existingRecord = await entry.model.findFirst({
                    where: {
                        name: {
                            equals: validatedData.name,
                            mode: "insensitive",
                        },
                    },
                });

                if (existingRecord) {
                    return apiError(res, {
                        message: `${resource} with name "${validatedData.name}" already exists.`,
                    });
                }
            }
            const data = await prisma.$transaction(async (tx) => {
                const { price, ...createData } = validatedData;
                const created = await (entry.model as any).create({
                    data: createData,
                });

                const entityType = PriceEntityMap[resource];
                if (entityType && price !== undefined) {
                    await upsertPriceRule(entityType, created.id, Number(price), {}, tx);
                }
                return created;
            });

            // Re-fetch price for response
            const entityType = PriceEntityMap[resource];
            if (entityType) {
                (data as any).price = await getActivePriceAmount(entityType, (data as any).id);
            }

            return apiResponse(res, {
                data,
                message: `${resource} added successfully.`,
            });
        } catch (error) {
            console.error(`Error adding ${req.params.resource}:`, error);
            return apiError(res, {
                message: `Failed to add ${req.params.resource}.`,
            });
        }
    },
    handleGenericUpdate: async (req: Request, res: Response) => {
        try {
            const { resource, id } = req.params;
            const entry = ModelMap[resource];
            if (!entry) return res.status(404).json({ message: "Invalid resource type." });

            // Validate body using the partial schema for updates
            const validatedData = entry.schema.partial().parse(req.body);
            const { parameters, ...restData } = validatedData;
            const modelsWithUniqueName = ["branches", "buildings", "floors", "room-types", "departments", "amenity", "surgery", "treatmentConfiguration", "physioConfiguration", "labConfiguration"];

            // Only check name for these specific models
            if (modelsWithUniqueName.includes(resource) && validatedData.name) {
                const existingRecord = await entry.model.findFirst({
                    where: {
                        name: {
                            equals: validatedData.name,
                            mode: "insensitive",
                        },
                        NOT: {
                            id,
                        },
                    },
                });

                if (existingRecord) {
                    return apiError(res, {
                        message: `${resource} with name "${validatedData.name}" already exists.`,
                    });
                }
            }
            // Prepare update data
            const updateData: any = { ...restData };

            // Handle parameters ONLY if they exist AND if this is labConfiguration
            // This check ensures other resources without parameters work fine
            if (parameters && resource === "labConfiguration") {
                const parameterOperations: any = {};

                // Handle creates
                if (parameters.create && parameters.create.length > 0) {
                    parameterOperations.create = parameters.create;
                }

                // Handle updates - FIXED: removed .data wrapper
                if (parameters.update && parameters.update.length > 0) {
                    parameterOperations.update = parameters.update.map((up: any) => {
                        const { id, ...fields } = up; // Extract id and use remaining fields as data
                        return {
                            where: { id },
                            data: fields, // Directly use the fields without .data wrapper
                        };
                    });
                }

                // Handle deletes
                if (parameters.delete && parameters.delete.length > 0) {
                    parameterOperations.delete = parameters.delete.map((id: string) => ({
                        id,
                    }));
                }

                // Handle upserts
                if (parameters.upsert && parameters.upsert.length > 0) {
                    parameterOperations.upsert = parameters.upsert;
                }

                // Only add parameters to updateData if there are operations
                if (Object.keys(parameterOperations).length > 0) {
                    updateData.parameters = parameterOperations;
                }
            }

            // Perform the update WITH parameters included
            const data = await prisma.$transaction(async (tx) => {
                const { price, ...actualUpdateData } = updateData;

                const updated = await (entry.model as any).update({
                    where: { id },
                    data: actualUpdateData,
                    include:
                        resource === "labConfiguration"
                            ? {
                                  parameters: true,
                              }
                            : undefined,
                });

                const entityType = PriceEntityMap[resource];
                if (entityType && price !== undefined) {
                    await upsertPriceRule(entityType, id, Number(price), {}, tx);
                }

                return updated;
            });

            // Re-fetch price for response
            const entityType = PriceEntityMap[resource];
            if (entityType) {
                (data as any).price = await getActivePriceAmount(entityType, id);
            }

            return apiResponse(res, {
                data,
                message: `${resource} updated successfully.`,
            });
        } catch (error) {
            console.error(`Error updating ${req.params.resource}:`, error);

            return apiError(res, {
                message: `Failed to update ${req.params.resource}.`,
            });
        }
    },
    handleGenericDelete: async (req: Request, res: Response) => {
        try {
            const { resource, id } = req.params;
            const entry = ModelMap[resource];
            if (!entry) return res.status(404).json({ message: "Invalid resource type." });

            if (resource === "physioConfiguration") {
                const linked = await prisma.physioTherapy.count({ where: { physioConfigId: id } });
                if (linked > 0) return apiError(res, { message: "Physiotherapy configuration is linked to patient sessions and cannot be deleted." });
            }

            const data = await prisma.$transaction(async (tx) => {
                // Delete associated price rules if this resource has a pricing mapping
                const entityType = PriceEntityMap[resource];
                if (entityType) {
                    await deletePrices(entityType, id, tx);
                }

                // Delete the resource itself using the transaction client
                return await (tx as any)[entry.modelName].delete({
                    where: { id },
                });
            });

            return apiResponse(res, {
                data,
                message: `${resource} deleted successfully.`,
            });
        } catch (error: any) {
            console.error(`Error deleting ${req.params.resource}:`, error);
            if (error.code === "P2003") {
                return apiError(res, {
                    message: `${req.params.resource} has been referenced in existing records and cannot be deleted.`,
                });
            }
            return apiError(res, {
                message: `Failed to delete ${req.params.resource}.`,
            });
        }
    },
};
