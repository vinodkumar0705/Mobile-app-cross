import { Router } from "express";
import { RoomManagementController } from "../controllers/room.management.controller";

const RoomRouter = Router();

RoomRouter.patch("/blockUnblockRoom", RoomManagementController.blockUnblockRoom);

export { RoomRouter };
