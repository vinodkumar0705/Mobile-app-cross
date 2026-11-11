import { z } from "zod";
import { AppError } from "./appError";
import { Request, Response, NextFunction } from "express";
// import { apiError } from "./formatter";

export const createValidator = (bodySchema?: z.ZodSchema, paramsSchema?: z.ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            // Validate body if bodySchema is provided

            if (bodySchema) {
                req.body = bodySchema.parse(req.body);
            }

            // Validate params if paramsSchema is provided
            if (paramsSchema) {
                req.params = paramsSchema.parse(req.params) as any;
            }

            next();
        } catch (error) {
            console.error("Validation error", error);
            if (error instanceof z.ZodError) {
                console.error("Zod Validation error", error);
                // return apiError(res, { error: error, message: "Validation Error" });
                return res.status(400).json({ error: error, message: "Validation Error" });
            } else {
                next(error);
            }
        }
    };
};
