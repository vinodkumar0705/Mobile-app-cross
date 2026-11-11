import { Request, Response, NextFunction } from "express";
import { requestContext } from "@/lib/async-context";

export const auditContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // This wraps all subsequent execution (including Prisma calls) in this context
    requestContext.run(req, () => {
        next();
    });
};
