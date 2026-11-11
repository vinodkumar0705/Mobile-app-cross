import { Router } from "express";
import { CommonController } from "../controllers/common.controller";

const CommonRouter = Router();

CommonRouter.get("/getAllDoctors", CommonController.getAllDoctors);
CommonRouter.get("/getAllPatients", CommonController.getAllPatients);
CommonRouter.get("/getPatientByPatientId/:id", CommonController.getPatientByPatientId);
CommonRouter.get("/getAllTimeSlots", CommonController.getTimeSlots);
CommonRouter.get("/getAllDepartments", CommonController.getAllDepartments);
CommonRouter.get("/getAllSpecialities", CommonController.getAllSpecialities);
CommonRouter.get("/getAllRoomTypes", CommonController.getAllRoomTypes);
CommonRouter.post("/getAllRooms", CommonController.getAllRooms);
CommonRouter.get("/getAllAmenities", CommonController.getAllAmenities);
CommonRouter.get("/getAllRoles", CommonController.getAllRoles);
CommonRouter.get("/getPatientById/:id", CommonController.getPatientById);
CommonRouter.get("/getAllEmployees", CommonController.getAllEmployees);
CommonRouter.get("/getAppointmentById/:id", CommonController.getAppointmentById);
CommonRouter.get("/getAuditLog", CommonController.getAuditLog);
CommonRouter.get("/getReferralCounts", CommonController.getReferralCounts);
CommonRouter.get("/getReferredPatients/:id", CommonController.getReferredPatients);

export { CommonRouter };
