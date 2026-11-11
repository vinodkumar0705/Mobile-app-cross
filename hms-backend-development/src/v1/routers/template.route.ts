import { Router } from "express";
import { TemplatesController } from "../controllers/template.controller";

const TemplateRouter = Router();

TemplateRouter.post("/createPrescriptionTemplate", TemplatesController.createPrescriptionTemplate);
TemplateRouter.get("/getAllPrescriptionTemplates", TemplatesController.getAllPrescriptionTemplates);
TemplateRouter.get("/getPrescriptionTemplateById/:id", TemplatesController.getPrescriptionTemplateById);
TemplateRouter.put("/updatePrescriptionTemplate/:id", TemplatesController.updatePrescriptionTemplate);
TemplateRouter.delete("/deletePrescriptionTemplate/:id", TemplatesController.deletePrescriptionTemplate);

export { TemplateRouter };
