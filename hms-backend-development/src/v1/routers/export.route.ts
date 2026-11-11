import { Router } from "express";
import { ExportController } from "../controllers/export.controller";

const ExportRouter = Router();

ExportRouter.get("/patients",          ExportController.exportPatients);
ExportRouter.get("/appointments",      ExportController.exportAppointments);
ExportRouter.get("/admissions",        ExportController.exportAdmissions);
ExportRouter.get("/lab-orders",        ExportController.exportLabOrders);
ExportRouter.get("/lab-results",       ExportController.exportLabResults);
ExportRouter.get("/pharmacy/stock",    ExportController.exportPharmacyStock);
ExportRouter.get("/pharmacy/batches",  ExportController.exportPharmacyBatches);
ExportRouter.get("/employees",         ExportController.exportEmployees);
ExportRouter.get("/billing",           ExportController.exportBilling);

export { ExportRouter };
