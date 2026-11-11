import multer from "multer";
import { apiError } from "../utils/formatter";
import { NextFunction, Request, Response } from "express";

export const handleMulterErrors = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "File size too large. Maximum allowed is 5MB" });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({ message: "Too many files uploaded. Maximum allowed is 10" });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({ message: "Unexpected field in file upload" });
        }
    } else if (err) {
        // Handle other errors
        return res.status(500).json({ message: "Something went wrong with the upload" });
    }

    // If no errors, proceed to next middleware
    next();
};
