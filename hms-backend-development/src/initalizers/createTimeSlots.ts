import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
const timeslots: Prisma.TimeSlotCreateManyInput[] = [
    { order: 1, startTime: new Date("2026-01-13T09:00:00"), endTime: new Date("2026-01-13T09:30:00") },
    { order: 2, startTime: new Date("2026-01-13T09:30:00"), endTime: new Date("2026-01-13T10:00:00") },
    { order: 3, startTime: new Date("2026-01-13T10:00:00"), endTime: new Date("2026-01-13T10:30:00") },
    { order: 4, startTime: new Date("2026-01-13T10:30:00"), endTime: new Date("2026-01-13T11:00:00") },
    { order: 5, startTime: new Date("2026-01-13T11:00:00"), endTime: new Date("2026-01-13T11:30:00") },
    { order: 6, startTime: new Date("2026-01-13T11:30:00"), endTime: new Date("2026-01-13T12:00:00") },
    { order: 7, startTime: new Date("2026-01-13T12:00:00"), endTime: new Date("2026-01-13T12:30:00") },
    { order: 8, startTime: new Date("2026-01-13T12:30:00"), endTime: new Date("2026-01-13T13:00:00") },
    { order: 9, startTime: new Date("2026-01-13T14:00:00"), endTime: new Date("2026-01-13T14:30:00") },
    { order: 10, startTime: new Date("2026-01-13T14:30:00"), endTime: new Date("2026-01-13T15:00:00") },
    { order: 11, startTime: new Date("2026-01-13T15:00:00"), endTime: new Date("2026-01-13T15:30:00") },
    { order: 12, startTime: new Date("2026-01-13T15:30:00"), endTime: new Date("2026-01-13T16:00:00") },
    { order: 13, startTime: new Date("2026-01-13T16:00:00"), endTime: new Date("2026-01-13T16:30:00") },
    { order: 14, startTime: new Date("2026-01-13T16:30:00"), endTime: new Date("2026-01-13T17:00:00") },
];
export const createTimeSlots = async () => {
    try {
        await prisma.timeSlot.deleteMany();
        const slots = await prisma.timeSlot.createMany({
            data: timeslots,
        });
        console.log("Time slots created", slots);
    } catch (error) {
        console.log("Error creating time slots", error);
    }
};
