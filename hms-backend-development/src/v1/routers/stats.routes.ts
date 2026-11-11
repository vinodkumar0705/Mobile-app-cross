import { Router } from "express";
import { StatsController } from "../controllers/stats.controller";
import { authenticate } from "../middlewares/auth.middleware";

export const StatsRouter = Router();

StatsRouter.get("/getStats", StatsController.getOutPatientsStats);
StatsRouter.get("/getDoctorAppointmentCount", authenticate, StatsController.getDoctorAppointmentCount);
StatsRouter.get("/getAllCounts", authenticate, StatsController.getAllCounts);

