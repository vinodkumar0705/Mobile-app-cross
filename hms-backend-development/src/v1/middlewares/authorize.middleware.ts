import { Request, Response, NextFunction } from "express";
import { authenticate } from "./auth.middleware";
import { apiError } from "../utils/formatter";
import { prisma } from "../../lib/prisma";
import { permissions as PermissionNames } from "../../lib/permissions";

export const authorize =
    (requiredPermissionCodes: string[] = []) =>
    async (req: Request, res: Response, next: NextFunction) => {
        authenticate(req, res, async () => {
            try {
                if (!req.user?.id) {
                    return res.status(401).json({ message: "You are not authorized to perform this action" });
                }

                const user = await prisma.user.findUnique({
                    where: { id: req.user.id },
                    select: {
                        isAdmin: true,
                        roles: {
                            select: {
                                permissions: {
                                    select: {
                                        name: true,
                                        code: true,
                                        description: true,
                                        id: true,
                                    },
                                },
                            },
                        },
                    },
                });

                if (!user) {
                    return res.status(401).json({ message: "User not found" });
                }

                if (user.isAdmin) {
                    return next();
                }

                const userPermissions = new Set<string>();
                user.roles.forEach((role) => {
                    role.permissions.forEach((permission) => {
                        userPermissions.add(permission.code);
                    });
                });

                const hasAllPermissions = requiredPermissionCodes.every((code) => userPermissions.has(code));

                if (!hasAllPermissions) {
                    const missingPermissions = requiredPermissionCodes.filter((code) => !userPermissions.has(code));

                    return res.status(403).json({
                        message: "You are not authorized to perform this action",
                        error: {
                            missingPermissions,
                            required: requiredPermissionCodes,
                        },
                    });
                }

                (req as any).userPermissions = Array.from(userPermissions);
                (req as any).userRoles = user.roles;

                return next();
            } catch (error) {
                console.error("Authorization error:", error);
                return res.status(500).json({ message: "Authorization failed" });
            }
        });
    };

export { PermissionNames };
