import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@prisma/client";
import { requestContext } from "./async-context";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const basePrisma = new PrismaClient({ adapter });

function getModelDelegate(modelName: string): any {
    const propertyName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    return (basePrisma as any)[propertyName];
}

function getAuditContext() {
    // Retrieves the `req` object we stored in the audit middleware
    const req = requestContext.getStore();

    let userRole = "SYSTEM";
    if (req?.user) {
        if (req.user.isAdmin) userRole = "ADMIN";
        else if (req.user.isDoctor) userRole = "DOCTOR";
        else if (req.user.isPatient) userRole = "PATIENT";
        else if (req.user.roles && req.user.roles.length > 0) userRole = req.user.roles[0].name;
    }

    return {
        userId: req?.user?.userId || null, // Will be populated by auth.middleware.ts
        ipAddress: req?.ip || (req?.headers["x-forwarded-for"] as string) || null,
        userAgent: req?.headers["user-agent"] || null,
        userRole: req?.user ? userRole : null,
    };
}

export const prisma = basePrisma.$extends({
    query: {
        $allModels: {
            async create({ model, args, query }) {
                const result = await query(args);

                if (model !== "AuditLog") {
                    try {
                        const context = getAuditContext(); // <--- Get context
                        await basePrisma.auditLog.create({
                            data: {
                                entity: model,
                                entityId: String((result as any).id || "N/A"),
                                action: "CREATE",
                                oldValue: Prisma.JsonNull,
                                newValue: result as any,
                                ...context, // <--- Include new fields
                            },
                        });
                    } catch (error) {
                        console.error(`Failed to create AuditLog for CREATE on ${model}:`, error);
                    }
                }
                return result;
            },

            async update({ model, args, query }) {
                if (model === "AuditLog") return query(args);

                const delegate = getModelDelegate(model);
                let oldValue = null;
                if (delegate && delegate.findUnique) {
                    try {
                        oldValue = await delegate.findUnique({ where: args.where });
                    } catch (error) {
                        console.error(`Failed to fetch oldValue for UPDATE on ${model}:`, error);
                    }
                }

                const result = await query(args);

                try {
                    const context = getAuditContext(); // <--- Get Context
                    await basePrisma.auditLog.create({
                        data: {
                            entity: model,
                            entityId: String((result as any).id || args.where?.id || "N/A"),
                            action: "UPDATE",
                            oldValue: oldValue as any,
                            newValue: result as any,
                            ...context, // <--- Include new fields
                        },
                    });
                } catch (error) {
                    console.error(`Failed to create AuditLog for UPDATE on ${model}:`, error);
                }
                return result;
            },

            async delete({ model, args, query }) {
                if (model === "AuditLog") return query(args);

                const delegate = getModelDelegate(model);
                let oldValue = null;
                if (delegate && delegate.findUnique) {
                    try {
                        oldValue = await delegate.findUnique({ where: args.where });
                    } catch (error) {
                        console.error(`Failed to fetch oldValue for DELETE on ${model}:`, error);
                    }
                }

                const result = await query(args);

                try {
                    const context = getAuditContext(); // <--- Get Context
                    await basePrisma.auditLog.create({
                        data: {
                            entity: model,
                            entityId: String(oldValue?.id || args.where?.id || "N/A"),
                            action: "DELETE",
                            oldValue: oldValue as any,
                            newValue: Prisma.JsonNull,
                            ...context, // <--- Include new fields
                        },
                    });
                } catch (error) {
                    console.error(`Failed to create AuditLog for DELETE on ${model}:`, error);
                }
                return result;
            },
        },
    },
}) as unknown as typeof basePrisma;
