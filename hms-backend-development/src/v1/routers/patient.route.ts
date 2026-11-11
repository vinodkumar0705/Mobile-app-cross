import { Router } from "express";
import { PatientController } from "../controllers/patient.controller";
import { PatientValidator } from "../validators/patient.validators";
import { authorize } from "../middlewares/permission.middleware";
import { PatientBillingController } from "../controllers/patientbilling.controller";
import { OPDPatientController } from "../controllers/opdpatient.controller";

const PatientRouter = Router();

PatientRouter.post("/bookAppointment", PatientValidator.BookAppointmentValidator, PatientController.bookAppointment);
PatientRouter.post("/admitPatient", PatientValidator.AdmitPatientValidator, PatientController.admitPatient);
PatientRouter.get("/getDoctorSlots", PatientController.getDoctorAvailableAndUnavailableSlots);
PatientRouter.get("/getDoctorAvailableDates", PatientController.getDoctorAvailableDates);
PatientRouter.post("/blockUnblockDoctorTimeSlot", PatientController.blockUnblockDoctorTimeSlot);
PatientRouter.get("/getAllAppointments", PatientController.getAllAppointments);
PatientRouter.get("/getAllAdmissions", PatientController.getAllAdmissions);
PatientRouter.post("/updateAppointmentStatus", PatientController.updateAppointmentStatus);
PatientRouter.post("/makeOutPatientToInPatient/:id", PatientValidator.MakeOutPatientToInPatientValidator, PatientController.makeOutPatientToInPatient);
PatientRouter.get("/getAppointmentById/:id", PatientController.getAppointmentById);
PatientRouter.get("/getAdmissionById/:id", PatientController.getAdmissionById);
PatientRouter.get("/getOutpatientById/:id", PatientController.getOutpatientById);
PatientRouter.patch("/updateAppointment/:id", PatientController.updateAppointment);
PatientRouter.patch("/updateAdmission/:id", PatientController.updateAdmission);
PatientRouter.get("/getAllReferrals", PatientController.getAllReferrals);
PatientRouter.get("/getPatientVitals/:id", PatientController.getPatientVitals);
PatientRouter.get("/getPatientHistory/:id", PatientController.getPatientHistory);
PatientRouter.get("/getInPatientHistory/:id", PatientController.getInPatientHistory);
PatientRouter.post("/addVitals", PatientValidator.AddVitalsValidator, PatientController.addVitals);
PatientRouter.get("/getPatientMedicalHistory/:id", PatientController.getPatientMedicalHistory);
PatientRouter.post("/addVisit", PatientValidator.AddVisitValidator, PatientController.addVisit);
PatientRouter.post("/addDiet", PatientValidator.AddDietValidator, PatientController.addDiet);
PatientRouter.post("/addPatientMeal", PatientValidator.AddPatientMealValidator, PatientController.addPatientMeal);
PatientRouter.get("/searchMedicines", PatientController.searchMedicines);
PatientRouter.post("/addPrescription", PatientValidator.AddPrescriptionValidator, PatientController.addPrescription);
PatientRouter.post("/createLabOrder", PatientValidator.AddLabOrderValidator, PatientController.createLabOrder);
PatientRouter.get("/searchPhysioTherapies", PatientController.searchPhysioTherapies);
PatientRouter.post("/addPhysioTherapy", PatientValidator.AddPhysioTherapyValidator, PatientController.addPhysioTherapy);
PatientRouter.post("/patientDischargeSummary", PatientController.patientDischargeSummary);
PatientRouter.get("/getDischargeSummaryById/:id", PatientController.getDischargeSummaryByAdmissionId);
PatientRouter.get("/getPatientVisitById/:id", PatientController.getPatientVisitsByAppointmentId);
PatientRouter.post("/roomTransfer", PatientController.roomTransfer);
PatientRouter.get("/getRoomTransfer/:id", PatientController.getRoomTransfer);
PatientRouter.get("/getAppointmentByPatientId/:id", PatientController.getAppointmentByPatientId);
PatientRouter.get("/getAdmissionByPatientId/:id", PatientController.getAdmissionByPatientId);
PatientRouter.get("/getAllPatients", PatientController.getAllPatients);
PatientRouter.get("/getBillByAppointmentId/:id", PatientBillingController.getBillByAppointmentId);
PatientRouter.get("/searchSurgeries", PatientController.searchSurgeries);
PatientRouter.post("/addPatientProcedure", PatientValidator.AddPatientProcedureValidator, PatientController.addPatientProcedure);
PatientRouter.put("/updatePatientProcedure/:id", PatientController.updatePatientProcedure);
PatientRouter.get("/searchLabTests", PatientController.searchLabTests);
PatientRouter.get("/searchTreatments", PatientController.searchTreatments);
PatientRouter.post("/addTreatment", PatientValidator.AddTreatmentValidator, PatientController.addTreatment);
PatientRouter.put("/updateTreatment/:id", PatientController.updateTreatment);
PatientRouter.put("/dischargePatient/:id", PatientController.dischargePatient);
PatientRouter.get("/getPatientBillSummary/:admissionId", PatientController.getBillSummary);
PatientRouter.get("/getReferralUsers", PatientController.getReferralUsers);
PatientRouter.post("/processPayment", PatientController.processPayment);
PatientRouter.get("/getPatientPaymentDetails/:admissionId", PatientController.getPatientPaymentDetails);
PatientRouter.get("/getPaymentDetailsById/:paymentId", PatientController.getPaymentDetailsById);
PatientRouter.get("/searchFoodItems", PatientController.searchFoodItems);
PatientRouter.get("/getDoctorsByPatientId/:id", PatientController.getDoctorsByPatientId);

// New Billing Routes
PatientRouter.patch("/updateBillItem/:id", PatientController.updateBillItem);
PatientRouter.post("/addBillAdjustment", PatientController.addBillAdjustment);
PatientRouter.delete("/deleteBillItem/:id", PatientController.deleteBillItem);
PatientRouter.delete("/removeBillAdjustment/:id", PatientController.removeBillAdjustment);

// New Billing Routes (New Architecture)
PatientRouter.get("/billing/getBillSummary/:id", PatientBillingController.getBillSummary);
PatientRouter.post("/billing/processPayment", PatientBillingController.processPayment);
PatientRouter.post("/billing/addBillAdjustment", PatientBillingController.addBillAdjustment);
PatientRouter.patch("/billing/updateBillItem/:id", PatientBillingController.updateBillItem);
PatientRouter.get("/billing/searchBillableEntities", PatientBillingController.searchBillableEntities);
PatientRouter.post("/billing/addBillItem", PatientBillingController.addBillItem);
PatientRouter.delete("/billing/deleteBillItem/:id", PatientBillingController.deleteBillItem);
PatientRouter.delete("/billing/removeBillAdjustment/:id", PatientBillingController.removeBillAdjustment);
PatientRouter.patch("/billing/updatePaymentDetails/:paymentId", PatientBillingController.updatePaymentDetails);
PatientRouter.delete("/billing/deletePaymentDetails/:paymentId", PatientBillingController.deletePaymentDetails);

//OPD Patient Routes
PatientRouter.post("/addOpdDiet", PatientValidator.AddDietValidator, OPDPatientController.addDiet);
PatientRouter.post("/createOpdLabOrder", PatientValidator.AddLabOrderValidator, OPDPatientController.createLabOrder);
PatientRouter.post("/addOpdTreatment", PatientValidator.AddTreatmentValidator, OPDPatientController.addTreatment);
PatientRouter.post("/addOpdVisit/:id", PatientValidator.AddVisitValidator, OPDPatientController.addVisit);
PatientRouter.post("/addOpdPhysioTherapy", PatientValidator.AddPhysioTherapyValidator, OPDPatientController.addPhysioTherapy);

export { PatientRouter };
