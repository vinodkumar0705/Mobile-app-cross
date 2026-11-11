import { configDotenv } from "dotenv";
import jwt from "jsonwebtoken";
configDotenv();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1y";

export const generateToken = (userId: string): string => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as string | any });
};

export const verifyToken = (token: string): jwt.JwtPayload | string => {
    return jwt.verify(token, JWT_SECRET);
};
