import express, { NextFunction, Response } from "express";
import dotenv from "dotenv";
import { IndexRouter } from "@/v1/routers/index.route";
import cors from "cors";
import { apiResponse } from "@/v1/utils/formatter";
import cookieParser from "cookie-parser";
import { prisma } from "@/lib/prisma";
import { startReminderWorker } from "@/v1/workers/reminder.worker";
import { auditContextMiddleware } from "@/v1/middlewares/audit.middleware";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: true,
        credentials: true,
    }),
);
app.use(auditContextMiddleware);
app.get("/api/health", (req, res) => {
    return res.json({ status: "ok", service: "backend" });
});

app.use(
    "/api/v1",
    (_, res: Response, next: NextFunction) => {
        res.setHeader("timestamp", new Date().toISOString());
        next();
    },
    IndexRouter,
);

process.on("SIGTERM", () => {
    console.log("Received SIGTERM, shutting down gracefully");
    process.exit(0);
});

app.listen(PORT, async () => {
    console.log("Server started on port ", PORT);
    try {
        await prisma.user.count();
    } catch (error) {
        console.log("database connection failed ⚠️");
    }
});

startReminderWorker();

