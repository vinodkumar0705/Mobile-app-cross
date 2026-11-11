import { Router } from "express";
import { DoctorController } from "../controllers/doctor.controller";
// import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/permission.middleware";
import { DoctorValidator } from "../validators/doctor.validator";
import { OPDDoctorController } from "../controllers/opddoctor.controller";

const DoctorRouter = Router();

DoctorRouter.get("/getAllPatients", DoctorController.getAllPatients);
DoctorRouter.get("/getAllAppointments", DoctorController.getAllAppointments);
DoctorRouter.get("/getAllAdmissions", DoctorController.getAllAdmissions);
DoctorRouter.get("/getAppointmentById/:id", DoctorController.getAppointmentById);
DoctorRouter.get("/getAdmissionById/:id", DoctorController.getAdmissionById);
DoctorRouter.get("/getPatientHistory/:id", DoctorController.getPatientHistory);
DoctorRouter.post("/addVitals", DoctorValidator.addVitals, DoctorController.addVitals);
DoctorRouter.post("/addVisit", DoctorValidator.addVisit, DoctorController.addVisit);
DoctorRouter.post("/addDiet", DoctorValidator.addDiet, DoctorController.addDiet);
DoctorRouter.get("/searchMedicines", DoctorController.searchMedicines);
DoctorRouter.get("/getDoctorSlots", DoctorController.getDoctorAvailableAndUnavailableSlots);
DoctorRouter.post("/blockUnblockDoctorTimeSlot", DoctorController.blockUnblockDoctorTimeSlot);
DoctorRouter.post("/addPrescription", DoctorValidator.addPrescription, DoctorController.addPrescription);
DoctorRouter.post("/createLabOrder", DoctorValidator.addLabOrder, DoctorController.createLabOrder);
DoctorRouter.get("/searchPhysioTherapies", DoctorController.searchPhysioTherapies);
DoctorRouter.post("/addPhysioTherapy", DoctorValidator.addPhysioTherapy, DoctorController.addPhysioTherapy);
DoctorRouter.get("/getInPatientHistory/:id", DoctorController.getInPatientHistory);
DoctorRouter.post("/approvePatientDischarge", DoctorController.approvePatientDischarge);
DoctorRouter.put("/dischargePatient/:id", DoctorController.dischargePatient);
DoctorRouter.get("/getPendingDischargeSummary", DoctorController.getPendingDischargeSummary);
DoctorRouter.get("/getDischargeSummaryById/:id", DoctorController.getDischargeSummaryById);
DoctorRouter.post("/completeConsultation/:id", DoctorValidator.completeConsultation, DoctorController.completeConsultation);
DoctorRouter.get("/getPatientVisitById/:id", DoctorController.getPatientVisitsByAppointmentId);
DoctorRouter.get("/getPatientMedicalHistory/:id", DoctorController.getPatientMedicalHistory);
DoctorRouter.get("/searchLabTests", DoctorController.searchLabTests);
DoctorRouter.get("/searchSurgeries", DoctorController.searchSurgeries);
DoctorRouter.post("/addPatientProcedure", DoctorValidator.addPatientProcedure, DoctorController.addPatientProcedure);
DoctorRouter.get("/searchTreatments", DoctorController.searchTreatments);
DoctorRouter.post("/addTreatment", DoctorValidator.addTreatment, DoctorController.addTreatment);
DoctorRouter.put("/updateTreatment/:id", DoctorController.updateTreatment);
DoctorRouter.put("/updatePatientProcedure/:id", DoctorController.updatePatientProcedure);
DoctorRouter.post("/addPatientMeal", DoctorValidator.addPatientMeal, DoctorController.addPatientMeal);
DoctorRouter.get("/searchFoodItems", DoctorController.searchFoodItems);
DoctorRouter.get("/getDoctorsByPatientId/:id", DoctorController.getDoctorsByPatientId);

//OPD Patient Routes
DoctorRouter.post("/addOpdDiet", DoctorValidator.addDiet, OPDDoctorController.addDiet);
DoctorRouter.post("/createOpdLabOrder", DoctorValidator.addLabOrder, OPDDoctorController.createLabOrder);
DoctorRouter.post("/addOpdTreatment", DoctorValidator.addTreatment, OPDDoctorController.addTreatment);
DoctorRouter.post("/addOpdVisit/:id", DoctorValidator.addVisit, OPDDoctorController.addVisit);
DoctorRouter.post("/addOpdPhysioTherapy", DoctorValidator.addPhysioTherapy, OPDDoctorController.addPhysioTherapy);

export { DoctorRouter };
