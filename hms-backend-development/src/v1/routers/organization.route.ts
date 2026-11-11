import { Router } from "express";
import { OrganizationController } from "../controllers/organization.controller";

export const OrganizationRouter = Router();

OrganizationRouter.get("/:resource", OrganizationController.handleGenericGet);
OrganizationRouter.get("/:resource/:id", OrganizationController.handleGenericGetById);
OrganizationRouter.post("/:resource", OrganizationController.handleGenericAdd);

OrganizationRouter.put("/:resource/:id", OrganizationController.handleGenericUpdate);
OrganizationRouter.delete("/:resource/:id", OrganizationController.handleGenericDelete);
OrganizationRouter.patch("/timeSlots/update/:organizationId", OrganizationController.updateTimeSlots);

//special
