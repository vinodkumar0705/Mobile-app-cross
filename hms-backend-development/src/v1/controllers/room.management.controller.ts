import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { apiError } from "../utils/formatter";
import { apiSuccess } from "../utils/formatter";

import { RoomStatus } from "@prisma/client";

export interface RoomManagementController {
    blockUnblockRoom: (req: Request, res: Response) => void;
}

export const RoomManagementController: RoomManagementController = {
    async blockUnblockRoom(req: Request, res: Response) {
        try {
            const { id, status: roomStatus, reason } = req.body;

            if (!id || !roomStatus) {
                return res.status(400).json({ message: "roomId and status are required" });
            }

            if (!Object.values(RoomStatus).includes(roomStatus as RoomStatus)) {
                return res.status(400).json({ message: `Invalid status. Must be one of: ${Object.values(RoomStatus).join(", ")}` });
            }

            const room = await prisma.room.findUnique({
                where: { id: String(id) },
            });

            if (!room) {
                return res.status(404).json({ message: "Room not found" });
            }

            if (room.status === RoomStatus.OCCUPIED) {
                return res.status(400).json({ message: "Cannot change status of a room occupied by a patient" });
            }

            const updatedRoom = await prisma.room.update({
                where: { id: String(id) },
                data: {
                    status: roomStatus as RoomStatus,
                    isAvailable: roomStatus === RoomStatus.AVAILABLE,
                    notes: roomStatus === RoomStatus.AVAILABLE ? null : (reason ?? null),
                },
            });

            return apiSuccess(res, {
                data: updatedRoom,
                message: `Room status updated to ${roomStatus} successfully`,
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to update room status",
            });
        }
    },
};
