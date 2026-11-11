import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { apiError, apiSuccess } from "../utils/formatter";
import { generateToken } from "../utils/jwt";
import { sanitizeUser } from "../utils/sanitizeUser";

export interface AuthController {
    signup: (req: Request, res: Response) => void;
    signin: (req: Request, res: Response) => void;
    logout: (req: Request, res: Response) => void;
    me: (req: Request, res: Response) => void;
}
const COOKIE_AGE = 30 * 24 * 60 * 60 * 1000; //  milliseconds
//  Number(process.env.COOKIE_AGE) ||

// const DOMAIN = process.env.NODE_ENV === "production" ? process.env.DOMAIN : undefined;
// const SECURE = process.env.NODE_ENV === "production" ? true : false;
// const SAME_SITE = process.env.NODE_ENV === "production" ? "none" : "lax";
// const HTTP_ONLY = true;
export const AuthController: AuthController = {
    async signup(req, res) {
        try {
            const body = req.body;

            const exists = await prisma.user.findFirst({
                where: {
                    OR: [{ phoneNumber: body.phoneNumber }, { email: body.email }, { username: body.username }],
                },
            });

            if (exists) {
                return res.status(403).json({ message: "User Already Exists" });
            }

            const hashedPassword = await bcrypt.hash(body.password, 10);

            const user = await prisma.user.create({
                data: {
                    fName: body.fName,
                    lName: body.lName,
                    username: body.username || null,
                    phoneNumber: body.phoneNumber || null,
                    email: body.email || null,
                    password: hashedPassword,
                    isPatient: false,
                    isDoctor: body.isDoctor || true,
                },
            });
            const token = generateToken(user.id);

            const sanitizedUser = sanitizeUser(user);
            res.cookie("user", sanitizedUser, { httpOnly: true, secure: false, sameSite: "lax", maxAge: COOKIE_AGE });
            res.cookie("token", token, { httpOnly: true, secure: false, sameSite: "lax", maxAge: COOKIE_AGE });
            return apiSuccess(res, { data: sanitizedUser, message: "User Created Successfully" });
        } catch (error) {
            return apiError(res, { message: "Unable to create user" });
        }
    },
    async signin(req, res) {
        try {
            const body = req.body;
            console.log(body);

            const user = await prisma.user.findFirst({
                where: {
                    AND: [
                        {
                            OR: [{ phoneNumber: body.identifier }, { email: body.identifier }, { username: body.identifier }],
                        },
                        {
                            OR: [{ isAdmin: true }, { isDoctor: true }, { isPatient: false }],
                        },
                    ],
                },
                select: {
                    id: true,
                    fName: true,
                    lName: true,
                    phoneNumber: true,
                    email: true,
                    password: true,
                    isAdmin: true,
                    isDoctor: true,
                    isPatient: true,
                },
            });

            if (!user || !user.password) {
                return apiError(res, { statusCode: "NOT_FOUND", message: "Unable to find user" });
            }
            if (!(await bcrypt.compare(body.password, user.password))) {
                return apiError(res, { statusCode: "UNAUTHORIZED", message: "Email/Phone Number or Password is incorrect" });
            }

            const token = generateToken(user.id);
            const sanitizedUser = sanitizeUser(user);

            res.cookie("user", sanitizedUser, { httpOnly: true, secure: false, sameSite: "lax", maxAge: COOKIE_AGE });
            res.cookie("token", token, { httpOnly: true, secure: false, sameSite: "lax", maxAge: COOKIE_AGE });
            return apiSuccess(res, {
                data: { ...sanitizedUser, token },
                message: "Authenticated",
            });
        } catch (error) {
            return apiError(res, { statusCode: "INTERNAL_SERVER_ERROR", message: "Error signing in" });
        }
    },
    async logout(req, res) {
        try {
            res.clearCookie("user");
            res.clearCookie("token");
            return apiSuccess(res, { message: "Logged out successfully" });
        } catch (error) {
            return apiError(res, { statusCode: "INTERNAL_SERVER_ERROR", message: "Unable to logout" });
        }
    },
    async me(req, res) {
        try {
            const user = req.user;
            if (!user) {
                return res.status(404).json({ message: "User Not Found" });
            }
            const permissions = await prisma.permission.findMany({
                select: {
                    id: true,
                    code: true,
                    description: true,
                },
            });

            const sanitizedUser = sanitizeUser(user);
            return apiSuccess(res, {
                metadata: {
                    permissions,
                },
                data: sanitizedUser,
                message: "User Found",
            });
        } catch (error) {
            return apiError(res, { statusCode: "INTERNAL_SERVER_ERROR", message: "Unable to fetch user" });
        }
    },
};
