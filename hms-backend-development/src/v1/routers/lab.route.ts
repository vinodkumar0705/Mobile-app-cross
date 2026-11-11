import { Router } from "express";
import { LabController } from "../controllers/lab.controller";


const LabRouter = Router();

LabRouter.post("/createLabOrder", LabController.createLabOrder);
LabRouter.get("/getLabOrders", LabController.getLabOrders);
LabRouter.get("/getLabOrderById/:id", LabController.getLabOrderById);
LabRouter.get("/getLabOrderByAdmissionId/:admissionId", LabController.getLabOrderByAdmissionId);
LabRouter.get("/getLabOrderByPatientId/:patientId", LabController.getLabOrderByPatientId);
LabRouter.patch("/updateLabOrderStatus/:id", LabController.updateLabOrderStatus);
LabRouter.patch("/cancelLabOrder/:id", LabController.cancelLabOrder);
LabRouter.get("/getLabQueue", LabController.getLabQueue);
LabRouter.patch("/markSampleCollected/:id", LabController.markSampleCollected);
LabRouter.patch("/markProcessing/:id", LabController.markProcessing);
LabRouter.post("/enterLabValues/:id", LabController.enterLabValues);
LabRouter.patch("/updateLabValues/:id", LabController.updateLabValues);
LabRouter.get("/getLabResults", LabController.getLabResults);
LabRouter.get("/getLabResultById/:id", LabController.getLabResultById);
LabRouter.patch("/verifyLabResult/:id", LabController.verifyLabResult);
LabRouter.patch("/finalizeLabResult/:id", LabController.finalizeLabResult);
LabRouter.patch("/rejectLabResult/:id", LabController.rejectLabResult);
LabRouter.get("/getLabReportById/:id", LabController.getLabReportById);
LabRouter.get("/getLabReportByPatientId/:patientId", LabController.getLabReportByPatientId);
LabRouter.get("/getLabReportByAdmissionId/:admissionId", LabController.getLabReportByAdmissionId);


export { LabRouter };