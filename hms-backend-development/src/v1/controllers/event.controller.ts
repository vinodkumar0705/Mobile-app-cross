import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { apiError } from "../utils/formatter";
import { apiSuccess } from "../utils/formatter";
import { DiscountType, RecurrenceDay, BillItemType, PriceEntityType } from "@prisma/client";
import { getActivePriceAmount } from "../utils/pricing.util";


const DAY_MAP: Record<number, RecurrenceDay> = {
  0: RecurrenceDay.SUN,
  1: RecurrenceDay.MON,
  2: RecurrenceDay.TUE,
  3: RecurrenceDay.WED,
  4: RecurrenceDay.THU,
  5: RecurrenceDay.FRI,
  6: RecurrenceDay.SAT,
};

function getRecurrenceDay(date: Date): RecurrenceDay {
  return DAY_MAP[date.getDay()];
}

function calculateDiscount(gross: number, type: DiscountType, value: number): number {
  if (type === DiscountType.PERCENT) {
    return parseFloat(Math.min(gross, (gross * value) / 100).toFixed(2));
  }
  return parseFloat(Math.min(gross, value).toFixed(2));
}

export interface EventControllerType {
  createEvent: (req: Request, res: Response) => void;
  getAllEvents: (req: Request, res: Response) => void;
  getEventById: (req: Request, res: Response) => void;
  updateEvent: (req: Request, res: Response) => void;
  deleteEvent: (req: Request, res: Response) => void;
  toggleEventStatus: (req: Request, res: Response) => void;
  // computeDiscount: (req: Request, res: Response) => void;
  // applyEventOpd: (req: Request, res: Response) => void;
  // removeEventFromBill: (req: Request, res: Response) => void;
  getAvailableEventForAppointment: (req: Request, res: Response) => void;
}


export const EventController: EventControllerType = {


  async createEvent(req, res) {
    try {
      const {
        name,
        description,
        discountType,
        discountValue,
        recurrenceDays,
        startDate,
        endDate,
        isActive,
        // applicableCategories,
        // specificServiceIds,
      } = req.body;

      if (!name?.trim()) {
        return apiError(res, {
          statusCode: "BAD_REQUEST",
          message: "name is required",
        });
      }

      if (!discountType) {
        return apiError(res, {
          statusCode: "BAD_REQUEST",
          message: "discountType is required",
        });
      }

      if (discountValue == undefined) {
        return apiError(res, {
          statusCode: "BAD_REQUEST",
          message: "discountValue is required",
        });
      }

      if (!recurrenceDays) {
        return apiError(res, {
          statusCode: "BAD_REQUEST",
          message: "recurrenceDays is required",
        });
      }

      if (!startDate) {
        return apiError(res, {
          statusCode: "BAD_REQUEST",
          message: "startDate is required",
        });
      }

      if (!Object.values(DiscountType).includes(discountType)) {
        return apiError(res, {
          statusCode: "BAD_REQUEST",
          message: "discountType must be PERCENT or FLAT",
        });
      }

      if (typeof discountValue !== "number" || discountValue <= 0) {
        return apiError(res, {
          statusCode: "BAD_REQUEST",
          message: "discountValue must be a positive number",
        });
      }

      if (discountType === "PERCENT" && discountValue > 100) {
        return apiError(res, {
          statusCode: "BAD_REQUEST",
          message: "discountValue cannot exceed 100 for PERCENT",
        });
      }

      if (!Array.isArray(recurrenceDays) || recurrenceDays.length === 0) {
        return apiError(res, {
          statusCode: "BAD_REQUEST",
          message: "recurrenceDays must be a non-empty array",
        });
      }

      const validDays = Object.values(RecurrenceDay);
      const badDays = recurrenceDays.filter((d: any) => !validDays.includes(d));
      if (badDays.length) {
        return apiError(res, {
          statusCode: "BAD_REQUEST",
          message: `Invalid recurrenceDays: ${badDays.join(", ")}. Valid: ${validDays.join(", ")}`,
        });
      }

      if (isNaN(new Date(startDate).getTime())) {
        return apiError(res, {
          statusCode: "BAD_REQUEST",
          message: "startDate must be a valid date",
        });
      }

      if (endDate && isNaN(new Date(endDate).getTime())) {
        return apiError(res, {
          statusCode: "BAD_REQUEST",
          message: "endDate must be a valid date",
        });
      }

      if (endDate && new Date(endDate) < new Date(startDate)) {
        return apiError(res, {
          statusCode: "BAD_REQUEST",
          message: "endDate cannot be before startDate",
        });
      }

      const event = await prisma.$transaction(async (tx) => {
        return await tx.recurringEvent.create({
          data: {
            name: name.trim(),
            description: description ?? null,
            discountType,
            discountValue,
            recurrenceDays,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            isActive: isActive ?? true,
            // applicableCategories: applicableCategories ?? [],
            // specificServiceIds: specificServiceIds ?? [],
          },
        });
      });

      return apiSuccess(res, {
        data: event,
        message: "Event created successfully",
      });
    } catch (err: any) {
      console.error("Error creating event", err);
      if (err?.code === "P2002") {
        return apiError(res, {
          statusCode: "CONFLICT",
          message: "An event with this name already exists",
        });
      }
      return apiError(res, {
        statusCode: "INTERNAL_SERVER_ERROR",
        message: "Unable to create event",
      });
    }
  },


  async getAllEvents(req, res) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      // Admin UIs need a large window; callers should pass `limit` explicitly. Cap avoids runaway queries.
      const limit = Math.min(2000, Math.max(1, Number(req.query.limit) || 500));

      const where: any = {};
      if (req.query.isActive !== undefined) {
        where.isActive = req.query.isActive === "true";
      }

      const [data, total] = await prisma.$transaction([
        prisma.recurringEvent.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.recurringEvent.count({ where }),
      ]);

      return apiSuccess(res, {
        data,
        metadata: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        message: "Events fetched successfully",
      });
    } catch (error) {
      console.error("Error fetching events", error);
      return apiError(res, {
        statusCode: "INTERNAL_SERVER_ERROR",
        message: "Unable to fetch events",
      });
    }
  },

  async getEventById(req, res) {
    try {
      const { id } = req.params;

      const event = await prisma.recurringEvent.findUnique({
        where: { id },
      });

      if (!event) {
        return apiError(res, {
          statusCode: "NOT_FOUND",
          message: "Event not found",
        });
      }

      // Fetch recent PriceRules that were created by this event (via notes field)
      const recentPriceRules = await prisma.priceRule.findMany({
        where: {
          entityType: PriceEntityType.DOCTOR_CONSULTATION,
        },
        select: {
          id: true,
          entityId: true,   // doctorId
          price: true,
          active: true,
          validFrom: true,
          validUntil: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      return apiSuccess(res, {
        data: {
          ...event,
          recentPriceRules,
        },
        message: "Event fetched successfully",
      });
    } catch (error) {
      console.error("Error fetching event", error);
      return apiError(res, {
        statusCode: "INTERNAL_SERVER_ERROR",
        message: "Unable to fetch event",
      });
    }
  },


  async updateEvent(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        discountType,
        discountValue,
        recurrenceDays,
        startDate,
        endDate,
        isActive,
        applicableCategories,
        specificServiceIds,
      } = req.body;

      if (discountType && !Object.values(DiscountType).includes(discountType)) {
        return apiError(res, {
          statusCode: "BAD_REQUEST",
          message: "discountType must be PERCENT or FLAT",
        });
      }

      if (discountValue !== undefined && (typeof discountValue !== "number" || discountValue <= 0)) {
        return apiError(res, {
          statusCode: "BAD_REQUEST",
          message: "discountValue must be a positive number",
        });
      }

      if (discountType === "PERCENT" && discountValue > 100) {
        return apiError(res, {
          statusCode: "BAD_REQUEST",
          message: "discountValue cannot exceed 100 for PERCENT",
        });
      }

      if (recurrenceDays !== undefined) {
        if (!Array.isArray(recurrenceDays) || recurrenceDays.length === 0) {
          return apiError(res, {
            statusCode: "BAD_REQUEST",
            message: "recurrenceDays must be a non-empty array",
          });
        }
        const validDays = Object.values(RecurrenceDay);
        const badDays = recurrenceDays.filter((d: any) => !validDays.includes(d));
        if (badDays.length) {
          return apiError(res, {
            statusCode: "BAD_REQUEST",
            message: `Invalid recurrenceDays: ${badDays.join(", ")}`,
          });
        }
      }

      if (startDate && isNaN(new Date(startDate).getTime())) {
        return apiError(res, { statusCode: "BAD_REQUEST", message: "startDate must be a valid date" });
      }

      if (endDate && isNaN(new Date(endDate).getTime())) {
        return apiError(res, { statusCode: "BAD_REQUEST", message: "endDate must be a valid date" });
      }

      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.recurringEvent.findUnique({ where: { id } });
        if (!existing) throw new Error("Event not found");

        return await tx.recurringEvent.update({
          where: { id },
          data: {
            ...(name !== undefined && { name: name.trim() }),
            ...(description !== undefined && { description }),
            ...(discountType !== undefined && { discountType }),
            ...(discountValue !== undefined && { discountValue }),
            ...(recurrenceDays !== undefined && { recurrenceDays }),
            ...(startDate !== undefined && { startDate: new Date(startDate) }),
            ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
            ...(isActive !== undefined && { isActive }),
            ...(applicableCategories !== undefined && { applicableCategories }),
            ...(specificServiceIds !== undefined && { specificServiceIds }),
          },
        });
      });

      return apiSuccess(res, {
        data: result,
        message: "Event updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating event", error);
      if (error?.code === "P2002") {
        return apiError(res, { statusCode: "CONFLICT", message: "An event with this name already exists" });
      }
      return apiError(res, {
        statusCode: "INTERNAL_SERVER_ERROR",
        message: error?.message || "Unable to update event",
      });
    }
  },


  async deleteEvent(req, res) {
    try {
      const { id } = req.params;

      const existing = await prisma.recurringEvent.findUnique({ where: { id } });
      if (!existing) {
        return apiError(res, {
          statusCode: "NOT_FOUND",
          message: "Event not found",
        });
      }

      await prisma.recurringEvent.delete({
        where: { id },
      });

      return apiSuccess(res, {
        message: "Event deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting event", error);
      if (error?.code === "P2003") {
        return apiError(res, {
          statusCode: "CONFLICT",
          message: "This event is linked to bills and cannot be deleted",
        });
      }
      return apiError(res, {
        statusCode: "INTERNAL_SERVER_ERROR",
        message: error?.message || "Unable to delete event",
      });
    }
  },




  async toggleEventStatus(req, res) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        return apiError(res, {
          statusCode: "BAD_REQUEST",
          message: "isActive must be a boolean",
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.recurringEvent.findUnique({ where: { id } });
        if (!existing) throw new Error("Event not found");

        return await tx.recurringEvent.update({
          where: { id },
          data: { isActive },
        });
      });

      return apiSuccess(res, {
        data: result,
        message: `Event ${isActive ? "activated" : "deactivated"} successfully`,
      });
    } catch (error: any) {
      console.error("Error toggling event status", error);
      return apiError(res, {
        statusCode: "INTERNAL_SERVER_ERROR",
        message: error?.message || "Unable to toggle event status",
      });
    }
  },


  // In EventController object — add this new method:
  async getAvailableEventForAppointment(req, res) {
    try {
      const { appointmentId } = req.query;

      if (!appointmentId || typeof appointmentId !== "string") {
        return apiError(res, { statusCode: "BAD_REQUEST", message: "appointmentId is required" });
      }

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { doctor: true },
      });

      if (!appointment) {
        return apiError(res, { statusCode: "NOT_FOUND", message: "Appointment not found" });
      }

      const consultationCharge = await getActivePriceAmount(
        PriceEntityType.DOCTOR_CONSULTATION,
        appointment.doctorId,
      );

      const grossAmount = consultationCharge;
      if (grossAmount === null) {
        return apiError(res, { statusCode: "NOT_FOUND", message: "Consultation fee not found" });
      }
      const appointmentDate = new Date(appointment.appointmentDate);
      const recurrenceDay = getRecurrenceDay(appointmentDate);
      const dayStart = new Date(appointmentDate);
      dayStart.setHours(0, 0, 0, 0);

      const event = await prisma.recurringEvent.findFirst({
        where: {
          isActive: true,
          recurrenceDays: { has: recurrenceDay },
          startDate: { lte: appointmentDate },
          OR: [{ endDate: null }, { endDate: { gte: dayStart } }],
        },
        orderBy: { createdAt: "desc" },
      });

      if (!event) {
        return apiSuccess(res, {
          data: { eventAvailable: false },
          message: "No active event for this appointment date",
        });
      }

      const discountAmount = calculateDiscount(grossAmount, event.discountType, event.discountValue);
      const finalAmount = parseFloat((grossAmount - discountAmount).toFixed(2));

      return apiSuccess(res, {
        data: {
          eventAvailable: true,
          event: {
            id: event.id,
            name: event.name,
            description: event.description,
            discountType: event.discountType,
            discountValue: event.discountValue,
          },
          pricing: {
            originalAmount: grossAmount,
            discountAmount,
            finalAmount,
          },
        },
        message: "Event available for this appointment",
      });
    } catch (error) {
      return apiError(res, { statusCode: "INTERNAL_SERVER_ERROR", message: "Unable to fetch event for appointment" });
    }
  },


  // async computeDiscount(req, res) {
  //   try {
  //     const { eventId, grossAmount } = req.body;

  //     if (!eventId || typeof eventId !== "string") {
  //       return apiError(res, {
  //         statusCode: "BAD_REQUEST",
  //         message: "eventId is required",
  //       });
  //     }

  //     if (typeof grossAmount !== "number" || grossAmount <= 0) {
  //       return apiError(res, {
  //         statusCode: "BAD_REQUEST",
  //         message: "grossAmount must be a positive number",
  //       });
  //     }

  //     const event = await prisma.recurringEvent.findUnique({
  //       where: { id: eventId },
  //     });

  //     if (!event) {
  //       return apiError(res, {
  //         statusCode: "NOT_FOUND",
  //         message: "Event not found",
  //       });
  //     }

  //     if (!event.isActive) {
  //       return apiError(res, {
  //         statusCode: "BAD_REQUEST",
  //         message: "This event is currently inactive",
  //       });
  //     }

  //     const discountAmount = calculateDiscount(grossAmount, event.discountType, event.discountValue);
  //     const finalAmount = parseFloat((grossAmount - discountAmount).toFixed(2));

  //     return apiSuccess(res, {
  //       data: {
  //         eventId: event.id,
  //         eventName: event.name,
  //         discountType: event.discountType,
  //         discountValue: event.discountValue,
  //         grossAmount,
  //         discountAmount,
  //         finalAmount,
  //       },
  //       message: "Discount computed successfully",
  //     });
  //   } catch (error) {
  //     console.error("Error computing discount", error);
  //     return apiError(res, {
  //       statusCode: "INTERNAL_SERVER_ERROR",
  //       message: "Unable to compute discount",
  //     });
  //   }
  // },

  // async applyEventOpd(req, res) {
  //   try {
  //     const { appointmentId } = req.body;

  //     if (!appointmentId) {
  //       return apiError(res, {
  //         statusCode: "BAD_REQUEST",
  //         message: "appointmentId is required",
  //       });
  //     }

  //     const appointment = await prisma.appointment.findUnique({
  //       where: { id: appointmentId },
  //       include: {
  //         doctor: true,
  //       },
  //     });

  //     if (!appointment) {
  //       return apiError(res, {
  //         statusCode: "NOT_FOUND",
  //         message: "Appointment not found",
  //       });
  //     }

  //     if (!appointment.doctor) {
  //       return apiError(res, {
  //         statusCode: "NOT_FOUND",
  //         message: "Doctor not found for this appointment",
  //       });
  //     }

  //     const grossAmount = parseFloat(appointment.doctor.consultationCharge ?? "0");

  //     if (!grossAmount || grossAmount <= 0) {
  //       return apiError(res, {
  //         statusCode: "BAD_REQUEST",
  //         message: "Doctor consultation charge is not configured",
  //       });
  //     }

  //     const appointmentDate = new Date(appointment.appointmentDate);
  //     const recurrenceDay = getRecurrenceDay(appointmentDate);
  //     const dayStart = new Date(appointmentDate);
  //     dayStart.setHours(0, 0, 0, 0);

  //     const event = await prisma.recurringEvent.findFirst({
  //       where: {
  //         isActive: true,
  //         recurrenceDays: { has: recurrenceDay },
  //         startDate: { lte: appointmentDate },
  //         OR: [
  //           { endDate: null },
  //           { endDate: { gte: dayStart } },
  //         ],
  //       },
  //       orderBy: { createdAt: "desc" },
  //     });

  //     // ── No event — apply full price, no PriceRule created ─────────────────
  //     if (!event) {
  //       await prisma.appointment.update({
  //         where: { id: appointmentId },
  //         data: { paidAmount: Math.round(grossAmount) },
  //       });

  //       return apiSuccess(res, {
  //         data: {
  //           eventApplied: false,
  //           pricing: {
  //             originalAmount: grossAmount,
  //             discountAmount: 0,
  //             finalAmount: grossAmount,
  //           },
  //         },
  //         message: "No active event found. Full price applied.",
  //       });
  //     }

  //     // ── Event found — calculate discount, write PriceRule ─────────────────
  //     const discountAmount = calculateDiscount(grossAmount, event.discountType, event.discountValue);
  //     const finalAmount = parseFloat((grossAmount - discountAmount).toFixed(2));

  //     const dayEnd = new Date(appointmentDate);
  //     dayEnd.setHours(23, 59, 59, 999);

  //     // Encode event context in notes — no FK relation needed
  //     const notes = `event:${event.id}|${event.name}|${event.discountType}|${event.discountValue}`;

  //     await prisma.$transaction(async (tx) => {
  //       await tx.priceRule.updateMany({
  //         where: {
  //           entityType: PriceEntityType.DOCTOR_CONSULTATION,
  //           entityId: appointment.doctorId,
  //           active: true,
  //         },
  //         data: { active: false },
  //       });

  //       // Create event-driven PriceRule valid only for today
  //       await tx.priceRule.create({
  //         data: {
  //           entityType: PriceEntityType.DOCTOR_CONSULTATION,
  //           entityId: appointment.doctorId,
  //           price: finalAmount,
  //           validFrom: dayStart,
  //           validUntil: dayEnd,
  //           active: true,
  //         },
  //       });

  //       // Update appointment paidAmount
  //       await tx.appointment.update({
  //         where: { id: appointmentId },
  //         data: { paidAmount: Math.round(finalAmount) },
  //       });
  //     });

  //     return apiSuccess(res, {
  //       data: {
  //         eventApplied: true,
  //         event: {
  //           id: event.id,
  //           name: event.name,
  //           discountType: event.discountType,
  //           discountValue: event.discountValue,
  //         },
  //         pricing: {
  //           originalAmount: grossAmount,
  //           discountAmount,
  //           finalAmount,
  //         },
  //       },
  //       message: "OPD event applied successfully",
  //     });
  //   } catch (error: any) {
  //     console.error("Error applying OPD event", error);
  //     return apiError(res, {
  //       statusCode: "INTERNAL_SERVER_ERROR",
  //       message: error?.message || "Unable to apply OPD event",
  //     });
  //   }
  // },


  // async removeEventFromBill(req, res) {
  //   try {
  //     const { appointmentId } = req.body;

  //     if (!appointmentId || typeof appointmentId !== "string") {
  //       return apiError(res, {
  //         statusCode: "BAD_REQUEST",
  //         message: "appointmentId is required",
  //       });
  //     }

  //     const appointment = await prisma.appointment.findUnique({
  //       where: { id: appointmentId },
  //       include: { doctor: true },
  //     });

  //     if (!appointment) {
  //       return apiError(res, {
  //         statusCode: "NOT_FOUND",
  //         message: "Appointment not found",
  //       });
  //     }

  //     const grossAmount = parseFloat(appointment.doctor?.consultationCharge ?? "0");

  //     if (!grossAmount || grossAmount <= 0) {
  //       return apiError(res, {
  //         statusCode: "BAD_REQUEST",
  //         message: "Doctor consultation charge is not configured",
  //       });
  //     }

  //     await prisma.$transaction(async (tx) => {
  //       // Deactivate the event-driven PriceRule for this doctor
  //       await tx.priceRule.updateMany({
  //         where: {
  //           entityType: PriceEntityType.DOCTOR_CONSULTATION,
  //           entityId: appointment.doctorId,
  //           active: true,
  //         },
  //         data: { active: false },
  //       });

  //       // Restore full price on appointment
  //       await tx.appointment.update({
  //         where: { id: appointmentId },
  //         data: { paidAmount: Math.round(grossAmount) },
  //       });
  //     });

  //     return apiSuccess(res, {
  //       data: {
  //         appointmentId,
  //         restoredAmount: grossAmount,
  //       },
  //       message: "Event discount removed. Full price restored.",
  //     });
  //   } catch (error: any) {
  //     console.error("Error removing event from appointment", error);
  //     return apiError(res, {
  //       statusCode: "INTERNAL_SERVER_ERROR",
  //       message: error?.message || "Unable to remove event discount",
  //     });
  //   }
  // },
};