import { Router } from "express";
import { EventController } from "../controllers/event.controller";
const EventRouter = Router();


EventRouter.post("/createEvent", EventController.createEvent);
EventRouter.get("/getAllEvents", EventController.getAllEvents);
EventRouter.get("/getEventById/:id", EventController.getEventById);
EventRouter.patch("/updateEvent/:id", EventController.updateEvent);
EventRouter.delete("/deleteEvent/:id", EventController.deleteEvent);
EventRouter.patch("/toggleEventStatus/:id", EventController.toggleEventStatus);
// EventRouter.post("/computeDiscount", EventController.computeDiscount);
// EventRouter.post("/applyEventOpd", EventController.applyEventOpd);
// EventRouter.delete("/removeEventFromBill/:id", EventController.removeEventFromBill);
EventRouter.get("/getAvailableEventForAppointment/:id", EventController.getAvailableEventForAppointment);

export { EventRouter };