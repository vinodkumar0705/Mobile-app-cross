import { Router } from "express";
import { PharmacyController } from "../controllers/pharmacy.controller";
import { PharmacyValidator } from "../validators/pharmacy.validators";
import { authorize } from "../middlewares/permission.middleware";

const PharmacyRouter = Router();

PharmacyRouter.get("/getAllMedicalItems", PharmacyController.getAllMedicalItems);
PharmacyRouter.get("/getMedicalItemById/:id", PharmacyController.getMedicalItemById);
PharmacyRouter.get("/getAllStockMovements", PharmacyController.getAllStockMovements);
PharmacyRouter.post("/updateStock", PharmacyValidator.StockAdjustmentValidator, PharmacyController.updateStock);
PharmacyRouter.get("/getAllBatches", PharmacyController.getAllBatches);
PharmacyRouter.post("/createMedicalItem", PharmacyValidator.MedicalItemValidator, PharmacyController.createMedicalItem);
PharmacyRouter.patch("/updateMedicalItem/:id", PharmacyValidator.MedicalItemValidator, PharmacyController.updateMedicalItem);
PharmacyRouter.delete("/deleteMedicalItem/:id", PharmacyController.deleteMedicalItem);
PharmacyRouter.post("/createBatch", PharmacyValidator.BatchValidator, PharmacyController.createBatch);
PharmacyRouter.patch("/updateBatch/:id", PharmacyValidator.UpdateBatchValidator, PharmacyController.updateBatch);
PharmacyRouter.post("/dispense", PharmacyValidator.DispensationValidator, PharmacyController.dispenseItem);
PharmacyRouter.get("/getPrescriptionsByPatientId/:patientId", PharmacyController.getPrescriptionsByPatientId);
PharmacyRouter.post("/createBill", PharmacyValidator.BillValidator, PharmacyController.createBill);
PharmacyRouter.get("/getAllBills", PharmacyController.getAllBills);
PharmacyRouter.get("/getBillById/:id", PharmacyController.getBillById);
PharmacyRouter.get("/bills/:id/payments", PharmacyController.getPaymentsByBillId);
PharmacyRouter.post("/bills/:id/payment", PharmacyValidator.RecordPaymentValidator, PharmacyController.recordPayment);
PharmacyRouter.post("/bills/:id/cancel", PharmacyController.cancelBill);
// PharmacyRouter.get("/getBillByPatientId/:patientId", PharmacyController.getBillByPatientId);
PharmacyRouter.get("/getBatchesByItemId/:itemId", PharmacyController.getBatchesByItemId);

export { PharmacyRouter };

