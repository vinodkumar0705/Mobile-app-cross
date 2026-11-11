import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { apiError } from "../utils/formatter";
import { apiSuccess } from "../utils/formatter";

export const PermissionController = {
    async getAllPermissions(req: Request, res: Response) {
        try {
            const permissions = await prisma.permission.findMany({
                select: {
                    id: true,
                    name: true,
                    code: true,
                    description: true,
                },
            });
            return apiSuccess(res, {
                data: permissions,
            });
        } catch (error) {
            return apiError(res, {
                message: "Failed to fetch permissions",
            });
        }
    },
    async getAllRoles(req: Request, res: Response) {
        try {
            const roles = await prisma.role.findMany({
                select: {
                    id: true,
                    name: true,
                },
            });
            return apiSuccess(res, {
                data: roles,
            });
        } catch (error) {
            return apiError(res, {
                message: "Failed to fetch roles",
            });
        }
    },
    async getPermissionsForRole(req: Request, res: Response) {
        try {
            const roleId = req.params.roleId as string;
            const permissions = await prisma.role.findUnique({
                where: {
                    id: roleId,
                },
                select: {
                    id: true,
                    name: true,
                    permissions: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                        },
                    },
                },
            });
            return apiSuccess(res, {
                data: permissions,
            });
        } catch (error) {
            return apiError(res, {
                message: "Failed to fetch permissions",
            });
        }
    },
    async updatePermissionsForRole(req: Request, res: Response) {
        try {
            const roleId = req.params.roleId as string;
            const { permissionIds } = req.body as { permissionIds: string[] };
            await prisma.role.update({
                where: {
                    id: roleId,
                },
                data: {
                    permissions: {
                        set: permissionIds.map((id) => ({ id })),
                    },
                },
            });
            return apiSuccess(res, {
                data: "Permissions updated successfully",
            });
        } catch (error) {
            return apiError(res, {
                message: "Failed to update permissions",
            });
        }
    },
    async createRole(req: Request, res: Response) {
        try {
            const { name } = req.body as { name: string };
            const role = await prisma.role.create({
                data: {
                    name,
                },
            });
            return apiSuccess(res, {
                data: role,
            });
        } catch (error) {
            return apiError(res, {
                message: "Failed to create role",
            });
        }
    },
    async updateRole(req: Request, res: Response) {
        try {
            const roleId = req.params.roleId as string;
            const { name } = req.body as { name: string };
            const role = await prisma.role.update({
                where: {
                    id: roleId,
                },
                data: {
                    name,
                },
            });
            return apiSuccess(res, {
                data: role,
                message: "Role updated successfully",
            });
        } catch (error) {
            return apiError(res, {
                message: "Failed to update role",
            });
        }
    },
    async deleteRole(req: Request, res: Response) {
        try {
            const roleId = req.params.roleId as string;
            const roleUser = await prisma.user.findMany({
                where: {
                    roles: {
                        some: {
                            id: roleId,
                        },
                    },
                },
            });
            if (roleUser.length > 0) {
                return apiError(res, {
                    status: 403,
                    message: "This role is assigned to some users",
                });
            }
            await prisma.role.delete({
                where: {
                    id: roleId,
                },
            });
            return apiSuccess(res, {
                data: "Role deleted successfully",
            });
        } catch (error) {
            return apiError(res, {
                message: "Failed to delete role",
            });
        }
    },
};
