import { Router } from "express";
import { PricingController } from "../controllers/pricing.controller";

export const PricingRouter = Router();

PricingRouter.get("/getAllPrices", PricingController.getAllPrices);
PricingRouter.post("/createPrice", PricingController.createPrice);
PricingRouter.put("/updatePrice/:id", PricingController.updatePrice);
PricingRouter.get("/getEntityByType/:entityType", PricingController.getEntityByType);
PricingRouter.get("/getBatchesByMedicalItem/:medicalItemId", PricingController.getBatchesByMedicalItem);
