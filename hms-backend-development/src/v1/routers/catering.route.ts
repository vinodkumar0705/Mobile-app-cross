import { Router } from "express";
import { CateringController } from "../controllers/catering.controller";

export const CateringRouter = Router();

CateringRouter.post("/createFoodItem", CateringController.createFoodItem);
CateringRouter.patch("/updateFoodItem/:id", CateringController.updateFoodItem);
CateringRouter.delete("/deleteFoodItem/:id", CateringController.deleteFoodItem);
CateringRouter.get("/getAllFoodItems", CateringController.getAllFoodItems);
