// v1/middlewares/permission.middleware.ts

import { Request, Response, NextFunction } from "express";
import { authenticate } from "./auth.middleware";
import { apiError } from "../utils/formatter";
import { prisma } from "../../lib/prisma";
import { PermissionCode } from "@/lib/permissions";

interface AuthorizeOptions {
    codes: PermissionCode[];
    strategy?: "AND" | "OR";
}

function checkPermission(codes: PermissionCode[], userPermissions: string[], isAdmin?: boolean, strategy: "AND" | "OR" = "AND") {
    if (isAdmin) return true;
    if (!userPermissions || userPermissions.length < 1) return false;

    const permissionSet = new Set(userPermissions);

    if (strategy === "AND") {
        return codes.every((code) => permissionSet.has(code));
    } else {
        return codes.some((code) => permissionSet.has(code));
    }
}

export const authorize = (requiredPermissionCodes: string[] | AuthorizeOptions) => async (req: Request, res: Response, next: NextFunction) => {
    return next();
    authenticate(req, res, async () => {
        try {
            const user = req.user;
            if (!user?.id) {
                return res.status(401).json({ message: "You are not authorized to perform this action" });
            }

            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            const userPermissions = new Set<string>();
            user.roles.forEach((role) => {
                role.permissions.forEach((permission) => {
                    userPermissions.add(permission.code);
                });
            });

            const options: AuthorizeOptions = Array.isArray(requiredPermissionCodes) ? { codes: requiredPermissionCodes as PermissionCode[], strategy: "AND" } : requiredPermissionCodes;

            const hasPermission = checkPermission(options.codes, Array.from(userPermissions), user.isAdmin, options.strategy);

            if (!hasPermission) {
                const missingPermissions = options.codes.filter((code) => !userPermissions.has(code));
                return res.status(403).json({
                    message: "You are not authorized to perform this action",
                    error: { missingPermissions, required: options.codes, strategy: options.strategy },
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
