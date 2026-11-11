import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { apiError } from "../utils/formatter";
import { prisma } from "../../lib/prisma";

declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                id: string;
                email: string | null;
                username: string | null;
                phoneNumber: string | null;
                fName: string | null;
                lName: string | null;
                isPatient: boolean;
                isDoctor: boolean;
                isAdmin: boolean;
                roles: {
                    name: string;
                    permissions: {
                        code: string;
                    }[];
                }[];
            };
        }
    }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const bearerToken = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.split(" ")[1] : undefined;
        const token = bearerToken || req.cookies?.token;

        if (!token) return res.status(401).json({ message: "Not_SIGNED_IN" });

        const decoded = verifyToken(token) as { userId: string };

        const user = await prisma.user.findUnique({
            where: {
                id: decoded.userId,
            },
            select: {
                id: true,
                fName: true,
                lName: true,
                email: true,
                phoneNumber: true,
                username: true,
                isAdmin: true,
                isDoctor: true,
                isPatient: true,
                roles: {
                    select: {
                        name: true,
                        permissions: {
                            select: {
                                code: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            return res.status(401).json({ message: "You are not authorized to perform this action" });
        }

        req.user = { ...user, userId: decoded.userId };
        return next();
    } catch (error) {
        return res.status(500).json({ message: "Server Error" });
    }
};
