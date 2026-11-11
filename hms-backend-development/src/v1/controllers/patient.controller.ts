import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { apiError } from "../utils/formatter";
import { apiSuccess } from "../utils/formatter";
import { BookAppointment, AdmitPatient, MakeOutPatientToInPatient } from "../types/patient.types";
import {
    AdmissionSourceType,
    AdmissionStatus,
    AppointmentStatus,
    BillItemStatus,
    BillItemType,
    BillStatus,
    BloodGroupType,
    PaymentFlowType,
    PaymentType,
    PhysioTherapyStatus,
    PriceEntityType,
    Prisma,
    ReferralType,
    RoomStatus,
    StaySessionStatus,
    SurgeryStatus,
    TreatmentStatus,
    VisitStatus,
    VisitType,
} from "@prisma/client";
import { getActivePriceAmount } from "../utils/pricing.util";
import { addItemToBill, deleteBillItem, getBillIdByEntity } from "../utils/billing.util";
import { generateOrganizationScopedId } from "@/lib/generateOrganizationScopedId";
import { sendNotification } from "../utils/twilio";
import {
    admissionPatientMessage,
    admissionDoctorMessage,
    admissionReferrerMessage,
    admissionManagingPersonMessage,
    followUpReminderPatientMessage,
    followUpReminderDoctorMessage,
    appointmentConfirmationPatientMessage,
    opdDoctorNotificationMessage,
    opdReferrerNotificationMessage,
    getAppointmentLink,
    getPatientPortalLink,
    formatDate,
    formatTime,
} from "../utils/whatsappTemplates";
import cuid from "cuid";

export interface PatientController {
    bookAppointment: (req: Request, res: Response) => void;
    getDoctorAvailableAndUnavailableSlots: (req: Request, res: Response) => void;
    getDoctorAvailableDates: (req: Request, res: Response) => void;
    blockUnblockDoctorTimeSlot: (req: Request, res: Response) => void;
    getAllAppointments: (req: Request, res: Response) => void;
    getAllAdmissions: (req: Request, res: Response) => void;
    updateAppointmentStatus: (req: Request, res: Response) => void;
    getAppointmentById: (req: Request, res: Response) => void;
    getAdmissionById: (req: Request, res: Response) => void;
    getOutpatientById: (req: Request, res: Response) => void;
    updateAppointment: (req: Request, res: Response) => void;
    updateAdmission: (req: Request, res: Response) => void;
    getAllReferrals: (req: Request, res: Response) => void;
    getPatientVitals: (req: Request, res: Response) => void;
    getPatientDiet: (req: Request, res: Response) => void;
    getPatientHistory: (req: Request, res: Response) => void;
    getInPatientHistory: (req: Request, res: Response) => void;
    admitPatient: (req: Request, res: Response) => void;
    addVitals: (req: Request, res: Response) => void;
    getPatientMedicalHistory: (req: Request, res: Response) => void;
    addDiet: (req: Request, res: Response) => void;
    addVisit: (req: Request, res: Response) => void;
    addPrescription: (req: Request, res: Response) => void;
    createLabOrder: (req: Request, res: Response) => void;
    searchPhysioTherapies: (req: Request, res: Response) => void;
    addPhysioTherapy: (req: Request, res: Response) => void;
    searchMedicines: (req: Request, res: Response) => void;
    patientDischargeSummary: (req: Request, res: Response) => void;
    getDischargeSummaryByAdmissionId: (req: Request, res: Response) => void;
    getPatientVisitsByAppointmentId: (req: Request, res: Response) => void;
    roomTransfer: (req: Request, res: Response) => void;
    getRoomTransfer: (req: Request, res: Response) => void;
    getAllPatients: (req: Request, res: Response) => void;
    getAppointmentByPatientId: (req: Request, res: Response) => void;
    getAdmissionByPatientId: (req: Request, res: Response) => void;
    getBillByAppointmentId: (req: Request, res: Response) => void;
    searchSurgeries: (req: Request, res: Response) => void;
    addPatientProcedure: (req: Request, res: Response) => void;
    searchLabTests: (req: Request, res: Response) => void;
    searchTreatments: (req: Request, res: Response) => void;
    addTreatment: (req: Request, res: Response) => void;
    updateTreatment: (req: Request, res: Response) => void;
    updatePatientProcedure: (req: Request, res: Response) => void;
    dischargePatient: (req: Request, res: Response) => void;
    getBillSummary: (req: Request, res: Response) => void;
    getReferralUsers: (req: Request, res: Response) => void;
    processPayment: (req: Request, res: Response) => void;
    getPatientPaymentDetails: (req: Request, res: Response) => void;
    getPaymentDetailsById: (req: Request, res: Response) => void;
    addPatientMeal: (req: Request, res: Response) => void;
    searchFoodItems: (req: Request, res: Response) => void;
    getDoctorsByPatientId: (req: Request, res: Response) => void;
    makeOutPatientToInPatient: (req: Request, res: Response) => void;
    updateBillItem: (req: Request, res: Response) => void;
    addBillAdjustment: (req: Request, res: Response) => void;
    deleteBillItem: (req: Request, res: Response) => void;
    removeBillAdjustment: (req: Request, res: Response) => void;
}

// Helper function to generate receipt number (MUST be async)
async function generateReceiptNumber(): Promise<string> {
    // Get current date in YYYYMMDD format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const datePrefix = `${year}${month}${day}`;

    // Get the last receipt number for today
    const lastReceipt = await prisma.paymentDetails.findFirst({
        where: {
            receiptNumber: {
                startsWith: `RCP-${datePrefix}-`,
            },
        },
        orderBy: {
            receiptNumber: "desc",
        },
    });

    let nextNumber = 1;

    if (lastReceipt && lastReceipt.receiptNumber) {
        // Extract the sequence number from last receipt
        // Format: RCP-YYYYMMDD-XXXX
        const match = lastReceipt.receiptNumber.match(/-(\d+)$/);
        if (match) {
            nextNumber = parseInt(match[1]) + 1;
        }
    }

    // Format sequence as 4-digit number (0001, 0002, etc.)
    const sequence = String(nextNumber).padStart(4, "0");

    return `RCP-${datePrefix}-${sequence}`;
}

async function enrichOrderWithDynamicPricing(order: any) {
    const testsWithDynamicPrice = await Promise.all(
        order.testIds.map(async (test: any) => {
            const dynamicPrice = await getActivePriceAmount(PriceEntityType.LAB, test.id);
            return { ...test, dynamicPrice };
        }),
    );

    const totalPrice = testsWithDynamicPrice.reduce((sum: number, test: any) => sum + test.dynamicPrice, 0);

    return { ...order, testIds: testsWithDynamicPrice, totalPrice };
}

//multiple orders
async function enrichOrdersWithDynamicPricing(orders: any[]) {
    return Promise.all(orders.map(enrichOrderWithDynamicPricing));
}

const bloodGroupNormalizedMap: Record<string, BloodGroupType> = {
    "A+": BloodGroupType.A_PLUS,
    "B+": BloodGroupType.B_PLUS,
    "AB+": BloodGroupType.AB_PLUS,
    "O+": BloodGroupType.O_PLUS,
    "A-": BloodGroupType.A_MINUS,
    "B-": BloodGroupType.B_MINUS,
    "AB-": BloodGroupType.AB_MINUS,
    "O-": BloodGroupType.O_MINUS,
    OTHER: BloodGroupType.OTHER,
    A_PLUS: BloodGroupType.A_PLUS,
    B_PLUS: BloodGroupType.B_PLUS,
    AB_PLUS: BloodGroupType.AB_PLUS,
    O_PLUS: BloodGroupType.O_PLUS,
    A_MINUS: BloodGroupType.A_MINUS,
    B_MINUS: BloodGroupType.B_MINUS,
    AB_MINUS: BloodGroupType.AB_MINUS,
    O_MINUS: BloodGroupType.O_MINUS,
};

function normalizeBloodGroup(value?: string | null): BloodGroupType | null {
    if (!value) return null;
    return bloodGroupNormalizedMap[value] || null;
}

const labOrderInclude = {
    patient: {
        include: {
            user: {
                select: {
                    id: true,
                    fName: true,
                    lName: true,
                    phoneNumber: true,
                    email: true,
                    bloodGroup: true,
                },
            },
        },
    },
    doctor: {
        include: {
            user: {
                select: {
                    id: true,
                    fName: true,
                    lName: true,
                    phoneNumber: true,
                    email: true,
                },
            },
        },
    },
    testIds: {
        select: {
            id: true,
            name: true,
            category: true,
            duration: true,
            preparationInstructions: true,
            parameters: true,
        },
    },
    visit: {
        select: {
            id: true,
            visitDate: true,
            chiefComplaint: true,
            diagnosis: true,
        },
    },
};

const labTestResultInclude = {
    patient: {
        include: {
            user: {
                select: {
                    id: true,
                    fName: true,
                    lName: true,
                    phoneNumber: true,
                    email: true,
                    bloodGroup: true,
                },
            },
        },
    },
    doctor: {
        include: {
            user: {
                select: {
                    id: true,
                    fName: true,
                    lName: true,
                    phoneNumber: true,
                    email: true,
                },
            },
        },
    },
    enteredBy: {
        include: {
            user: {
                select: { id: true, fName: true, lName: true },
            },
        },
    },
    verifiedBy: {
        include: {
            user: {
                select: { id: true, fName: true, lName: true },
            },
        },
    },
    parameterValues: {
        include: {
            labParameter: true,
        },
    },
    labOrder: {
        select: {
            id: true,
            status: true,
            orderDate: true,
            notes: true,
        },
    },
    labReport: true,
};

const labReportInclude = {
    labTestResult: {
        include: {
            parameterValues: {
                include: { labParameter: true },
            },
            enteredBy: {
                include: {
                    user: {
                        select: { id: true, fName: true, lName: true },
                    },
                },
            },
            verifiedBy: {
                include: {
                    user: {
                        select: { id: true, fName: true, lName: true },
                    },
                },
            },
            labOrder: {
                select: {
                    id: true,
                    status: true,
                    orderDate: true,
                    notes: true,
                    admissionId: true,
                    visitId: true,
                    testIds: {
                        select: {
                            id: true,
                            name: true,
                            category: true,
                            duration: true,
                            preparationInstructions: true,
                        },
                    },
                },
            },
        },
    },
    patient: {
        include: {
            user: {
                select: {
                    id: true,
                    fName: true,
                    lName: true,
                    phoneNumber: true,
                    email: true,
                    bloodGroup: true,
                },
            },
        },
    },
    validator: {
        include: {
            user: {
                select: { id: true, fName: true, lName: true },
            },
        },
    },
    auditLogs: {
        orderBy: { timestamp: "desc" as const },
        include: {
            changedBy: {
                select: { id: true, fName: true, lName: true },
            },
        },
    },
};

export const PatientController: PatientController = {
    // async admitPatient(req, res) {
    //     try {
    //         const body: AdmitPatient = req.body;

    //         // Validate doctor
    //         const doctor = await prisma.employeeInfo.findUnique({
    //             where: { id: body.admittingDoctorId },
    //         });
    //         if (!doctor) {
    //             return apiError(res, { message: "Admitting doctor not found" });
    //         }

    //         if (body.roomId) {
    //             // Validate Room
    //             const room = await prisma.room.findUnique({
    //                 where: { id: body.roomId },
    //             });
    //             if (!room) {
    //                 return apiError(res, { message: "Room not found" });
    //             }
    //             if (room.status !== RoomStatus.AVAILABLE) {
    //                 return apiError(res, { message: "Room is not available" });
    //             }
    //         }

    //         // Admission identity validation
    //         let checkFName: string | undefined = undefined;
    //         let checkLName: string | undefined = undefined;
    //         let checkPhone: string | undefined = undefined;

    //         if (body.patientId) {
    //             const existingPatientForCheck = await prisma.patientInfo.findUnique({ where: { id: body.patientId }, include: { user: true } });
    //             if (!existingPatientForCheck) {
    //                 return apiError(res, { message: "Patient not found" });
    //             }
    //             checkFName = existingPatientForCheck.user?.fName ?? undefined;
    //             checkLName = existingPatientForCheck.user?.lName ?? undefined;
    //             checkPhone = existingPatientForCheck.user?.phoneNumber ?? existingPatientForCheck.phoneNumber ?? undefined;
    //         } else if (body.patientInfo) {
    //             checkFName = body.patientInfo.fName;
    //             checkLName = body.patientInfo.lName;
    //             checkPhone = body.patientInfo.phoneNumber;
    //         }

    //         if (checkFName && checkPhone) {
    //             // same name and phone
    //             const matchingUsers = await prisma.user.findMany({ where: { fName: checkFName, lName: checkLName, phoneNumber: checkPhone }, select: { id: true } });
    //             if (matchingUsers.length > 0) {
    //                 const userIds = matchingUsers.map((u) => u.id);
    //                 const matchingPatients = await prisma.patientInfo.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
    //                 const patientIdsToCheck = matchingPatients.map((p) => p.id);

    //                 if (patientIdsToCheck.length > 0) {
    //                     // Active statuses except DISCHARGED and CANCELLED
    //                     const activeCount = await prisma.admission.count({
    //                         where: {
    //                             patientId: { in: patientIdsToCheck },
    //                             status: { notIn: [AdmissionStatus.DISCHARGED, AdmissionStatus.CANCELLED] as AdmissionStatus[] },
    //                         },
    //                     });

    //                     if (activeCount > 0) {
    //                         return apiError(res, {
    //                             message: "Patient already has an active admission. Please discharge before admitting again.",
    //                         });
    //                     }
    //                 }
    //             }
    //         }

    //         const normalizedBloodGroup = normalizeBloodGroup(body.patientInfo?.bloodGroup);

    //         const admission = await prisma.$transaction(async (tx) => {
    //             let patientId = body.patientId;
    //             let patientUser: any;

    //             if (!patientId && body.patientInfo) {
    //                 // Create or find patient based on patientInfo
    //                 let user = await tx.user.findFirst({
    //                     where: {
    //                         AND: [{ email: body.patientInfo.email }, { phoneNumber: body.patientInfo.phoneNumber }, { fName: body.patientInfo.fName }, { lName: body.patientInfo.lName }],
    //                     },
    //                 });

    //                 if (!user) {
    //                     user = await tx.user.create({
    //                         data: {
    //                             email: body.patientInfo.email,
    //                             fName: body.patientInfo.fName,
    //                             lName: body.patientInfo.lName,
    //                             phoneNumber: body.patientInfo.phoneNumber,
    //                             bloodGroup: normalizedBloodGroup,
    //                             isPatient: true,
    //                         },
    //                     });
    //                 } else if (!user.isPatient) {
    //                     user = await tx.user.update({
    //                         where: { id: user.id },
    //                         data: { isPatient: true },
    //                     });
    //                 }

    //                 patientUser = user;

    //                 let patientInfo = await tx.patientInfo.findUnique({
    //                     where: { userId: user.id },
    //                 });

    //                 if (!patientInfo) {
    //                     const { uniqueId: patientInfoId } = await generateOrganizationScopedId(tx, "PATIENT");
    //                     patientInfo = await tx.patientInfo.create({
    //                         data: {
    //                             id: patientInfoId,
    //                             userId: user.id,
    //                             gender: body.patientInfo.gender,
    //                             age: body.patientInfo.age,
    //                         },
    //                     });
    //                 }
    //                 patientId = patientInfo.id;
    //             } else if (patientId) {
    //                 const existingPatient = await tx.patientInfo.findUnique({
    //                     where: { id: patientId },
    //                     include: { user: true },
    //                 });
    //                 if (!existingPatient) {
    //                     throw new Error("Patient not found");
    //                 }
    //                 patientUser = existingPatient.user;
    //                 if (patientUser) {
    //                     if (body.patientInfo && (body.patientInfo.age !== undefined || body.patientInfo.gender)) {
    //                         await tx.patientInfo.update({
    //                             where: { id: patientId },
    //                             data: {
    //                                 ...(body.patientInfo.age !== undefined && {
    //                                     age: body.patientInfo.age,
    //                                 }),
    //                                 ...(body.patientInfo.gender !== undefined && {
    //                                     gender: body.patientInfo.gender,
    //                                 }),
    //                             },
    //                         });
    //                     }
    //                     if (
    //                         body.patientInfo &&
    //                         (body.patientInfo.fName !== undefined || body.patientInfo.lName || body.patientInfo.phoneNumber || body.patientInfo.email || body.patientInfo.bloodGroup)
    //                     ) {
    //                         await tx.user.update({
    //                             where: { id: patientUser.id },
    //                             data: {
    //                                 ...(body.patientInfo.fName !== undefined && {
    //                                     fName: body.patientInfo.fName,
    //                                 }),
    //                                 ...(body.patientInfo.lName !== undefined && {
    //                                     lName: body.patientInfo.lName,
    //                                 }),
    //                                 ...(body.patientInfo.phoneNumber !== undefined && {
    //                                     phoneNumber: body.patientInfo.phoneNumber,
    //                                 }),
    //                                 ...(body.patientInfo.email !== undefined && {
    //                                     email: body.patientInfo.email,
    //                                 }),
    //                                 ...(body.patientInfo.bloodGroup !== undefined && {
    //                                     bloodGroup: normalizedBloodGroup,
    //                                 }),
    //                             },
    //                         });
    //                     }
    //                 }
    //             } else {
    //                 throw new Error("Either patientId or patientInfo is required");
    //             }

    //             // 1. Update Patient Info (Insurance & Emergency)
    //             const updateData: any = {};
    //             if (body.insuranceInfo) {
    //                 updateData.insuranceProvider = body.insuranceInfo.insuranceProvider;
    //                 updateData.policyNumber = body.insuranceInfo.policyNumber;
    //                 updateData.policyHolderName = body.insuranceInfo.policyHolderName;
    //                 updateData.policyExpiryDate = body.insuranceInfo.policyExpiryDate;
    //                 updateData.tpaName = body.insuranceInfo.tpaName;
    //             }
    //             if (body.emergencyContact) {
    //                 updateData.emergencyContactName = body.emergencyContact.name;
    //                 updateData.emergencyContact = body.emergencyContact.contact;
    //                 updateData.emergencyContactNotes = body.emergencyContact.notes;
    //             }

    //             if (Object.keys(updateData).length > 0) {
    //                 await tx.patientInfo.update({
    //                     where: { id: patientId },
    //                     data: updateData,
    //                 });
    //             }

    //             // 2. Create Admission
    //             const newAdmission = await tx.admission.create({
    //                 data: {
    //                     patientId: patientId as string,

    //                     admittingDoctorId: body.admittingDoctorId,
    //                     admissionDateTime: body.admissionDateTime || new Date(),
    //                     expectedDischarge: body.expectedDischarge,
    //                     reason: body.reason,
    //                     sourceType: body.sourceType as AdmissionSourceType,
    //                     sourceAppointmentId: body.sourceAppointmentId,
    //                     sourceVisitId: body.sourceVisitId,
    //                     status: body.sourceType === "FROM_EMERGENCY" ? "ADMITTED" : "PLANNED",
    //                     paymentType: body.paymentType,
    //                     ...(body.paymentType === "UPI" || body.paymentType === "CARD" ? { amount: body.amount, txnId: body.txnId } : { amount: body.amount }),
    //                 },
    //             });
    //             if (body.roomId) {
    //                 // 3. Create Stay Session & Room Booking
    //                 const bookingStart = body.admissionDateTime || new Date();

    //                 const roomBooking = await tx.roomBooking.create({
    //                     data: {
    //                         roomId: body.roomId,
    //                         patientId: patientId as string,
    //                         doctorId: doctor.userId,
    //                         startTime: bookingStart,
    //                         status: "CONFIRMED",
    //                         title: `Admission for ${patientUser.fName} ${patientUser.lName}`,
    //                         description: "Inpatient Admission",
    //                         roomCharges: body.roomCharges || 0,
    //                     },
    //                 });

    //                 await tx.inpatientStaySession.create({
    //                     data: {
    //                         admissionId: newAdmission.id,
    //                         patientId: patientId as string,
    //                         currentRoomBookingId: roomBooking.id,
    //                         startedAt: bookingStart,
    //                         status: "ACTIVE",
    //                     },
    //                 });
    //                 // 4. Update Room Status
    //                 await tx.room.update({
    //                     where: { id: body.roomId },
    //                     data: {
    //                         status: room.capacity === room.currentOccupancy + 1 ? (body.sourceType === "FROM_EMERGENCY" ? RoomStatus.OCCUPIED : RoomStatus.RESERVED) : RoomStatus.AVAILABLE,
    //                         currentOccupancy: {
    //                             increment: 1,
    //                         },
    //                     },
    //                 });
    //             }

    //             if (body.referralInfo && body.referralInfo?.referralType !== ReferralType.NONE) {
    //                 await tx.reference.create({
    //                     data: {
    //                         patientId: patientId,
    //                         referralName: body.referralInfo.referralName,
    //                         referralContact: body.referralInfo.referralContact,
    //                         referralType: body.referralInfo.referralType,
    //                         concessionPercentage: body.referralInfo.concessionPercentage,
    //                         admissionId: newAdmission.id,
    //                         referralEmployeeId: body.referralInfo.referralEmployeeId,
    //                         referralId: body.referralInfo.referralId,
    //                     },
    //                 });
    //             }

    //             // 5. Add Room Charge to Bill
    //             try {
    //                 await addItemToBill({
    //                     patientId: patientId as string,
    //                     entityId: room.roomTypeId,
    //                     entityType: BillItemType.ROOM,
    //                     tx,
    //                     title: `Room Charges: ${room.roomNumber}`,
    //                     billType: "IPD",
    //                     admissionId: newAdmission.id,
    //                 });
    //             } catch (billingError) {
    //                 console.warn("[admitPatient] Skipped billing item creation due to schema mismatch or billing error:", billingError instanceof Error ? billingError.message : billingError);
    //             }

    //             // 6. Record deposit amount as a payment attached to the bill, and create PaymentDetails receipt
    //             if (body.amount && parseFloat(body.amount) > 0) {
    //                 const depositAmount = parseFloat(body.amount);

    //                 // Create PaymentDetails record (admission deposit receipt)
    //                 const receiptNumber = await generateReceiptNumber();
    //                 await tx.paymentDetails.create({
    //                     data: {
    //                         patientId: patientId as string,
    //                         admissionId: newAdmission.id,
    //                         paymentType: body.paymentType || "OTHER",
    //                         paymentStatus: "PAID",
    //                         amount: body.amount,
    //                         txnId: body.txnId || null,
    //                         receiptNumber,
    //                         notes: "Deposit amount paid during admission",
    //                     },
    //                 });

    //                 // Find or create bill to attach Payment
    //                 let bill = await tx.bill.findFirst({
    //                     where: {
    //                         patientId: patientId as string,
    //                         type: "IPD",
    //                         admissionId: newAdmission.id,
    //                         status: { in: [BillStatus.DRAFT, BillStatus.ACTIVE, BillStatus.PARTIAL] },
    //                     },
    //                     orderBy: { createdAt: "desc" },
    //                 });

    //                 if (!bill) {
    //                     bill = await tx.bill.create({
    //                         data: {
    //                             patientId: patientId as string,
    //                             type: "IPD",
    //                             admissionId: newAdmission.id,
    //                             status: BillStatus.ACTIVE,
    //                             notes: `System generated IPD bill`,
    //                         },
    //                     });
    //                 }

    //                 // Create Payment linked to the bill
    //                 await tx.payment.create({
    //                     data: {
    //                         billId: bill.id,
    //                         amount: depositAmount,
    //                         paymentMethod: body.paymentType || PaymentType.OTHER,
    //                         type: PaymentFlowType.ADVANCE,
    //                         txId: body.txnId || null,
    //                         notes: "Deposit amount paid during admission",
    //                     },
    //                 });

    //                 // Synchronize bill status
    //                 const fullBill = await tx.bill.findUnique({
    //                     where: { id: bill.id },
    //                     include: {
    //                         items: {
    //                             where: { status: BillItemStatus.ACTIVE },
    //                             include: { billAdjustments: { where: { active: true } } },
    //                         },
    //                         adjustments: { where: { active: true } },
    //                         payments: true,
    //                     },
    //                 });

    //                 if (fullBill) {
    //                     let totalItemsAmount = 0;
    //                     fullBill.items.forEach((item: any) => {
    //                         const itemSubtotal = item.unitPrice * item.quantity;
    //                         const taxAmount = (itemSubtotal * (item.taxPercent || 0)) / 100;
    //                         const itemAdjustments = item.billAdjustments.reduce((sum: number, adj: any) => {
    //                             const val = adj.mode === "PERCENTAGE" ? (itemSubtotal * adj.value) / 100 : adj.value;
    //                             return adj.type === "EXTRA_CHARGE" ? sum + val : sum - val;
    //                         }, 0);
    //                         totalItemsAmount += itemSubtotal + taxAmount + itemAdjustments;
    //                     });

    //                     const billAdjustmentsTotal = fullBill.adjustments.reduce((sum: number, adj: any) => {
    //                         const val = adj.mode === "PERCENTAGE" ? (totalItemsAmount * adj.value) / 100 : adj.value;
    //                         return adj.type === "EXTRA_CHARGE" ? sum + val : sum - val;
    //                     }, 0);

    //                     const totalPayable = totalItemsAmount + billAdjustmentsTotal;
    //                     const totalPaid = fullBill.payments.reduce((sum: number, p: any) => sum + p.amount, 0);

    //                     let newStatus = fullBill.status;
    //                     if (totalPaid >= totalPayable && totalPayable > 0) {
    //                         newStatus = BillStatus.PAID;
    //                     } else if (totalPaid > 0) {
    //                         newStatus = BillStatus.PARTIAL;
    //                     } else if (fullBill.status === BillStatus.PAID || fullBill.status === BillStatus.PARTIAL) {
    //                         newStatus = BillStatus.ACTIVE;
    //                     }

    //                     if (newStatus !== fullBill.status) {
    //                         await tx.bill.update({
    //                             where: { id: bill.id },
    //                             data: { status: newStatus },
    //                         });
    //                     }
    //                 }
    //             }

    //             return newAdmission;
    //         });

    //         try {
    //             await prisma.medicalHistory.create({
    //                 data: {
    //                     admissionId: admission.id,
    //                     patientId: admission.patientId,
    //                 },
    //             });
    //         } catch (medicalHistoryError) {
    //             console.warn(
    //                 "[admitPatient] Skipped medicalHistory.create after admission due to schema mismatch:",
    //                 medicalHistoryError instanceof Error ? medicalHistoryError.message : medicalHistoryError,
    //             );
    //         }

    //         // ── Admission Notifications ──
    //         try {
    //             // Re-fetch admission with all relations needed for notifications
    //             const admissionWithDetails = await prisma.admission.findUnique({
    //                 where: { id: admission.id },
    //                 include: {
    //                     patient: {
    //                         include: {
    //                             user: {
    //                                 select: {
    //                                     fName: true,
    //                                     lName: true,
    //                                     phoneNumber: true,
    //                                 },
    //                             },
    //                         },
    //                     },
    //                     admittingDoctor: {
    //                         include: {
    //                             user: {
    //                                 select: {
    //                                     fName: true,
    //                                     lName: true,
    //                                     phoneNumber: true,
    //                                 },
    //                             },
    //                         },
    //                     },
    //                     reference: {
    //                         select: {
    //                             referralName: true,
    //                             referralContact: true,
    //                             referralType: true,
    //                         },
    //                     },
    //                     staySession: {
    //                         include: {
    //                             currentRoomBooking: {
    //                                 include: {
    //                                     room: {
    //                                         select: { roomNumber: true },
    //                                     },
    //                                 },
    //                             },
    //                         },
    //                     },
    //                 },
    //             });

    //             const patientUser = admissionWithDetails?.patient?.user;
    //             // PatientInfo.phoneNumber first, fallback to User.phoneNumber
    //             const patientPhone = admissionWithDetails?.patient?.phoneNumber ?? patientUser?.phoneNumber;
    //             const patientName = patientUser ? `${patientUser.fName} ${patientUser.lName}`.trim() : "Patient";

    //             const doctorUser = admissionWithDetails?.admittingDoctor?.user;
    //             const doctorPhone = doctorUser?.phoneNumber;
    //             const doctorName = doctorUser ? `${doctorUser.fName} ${doctorUser.lName}`.trim() : "Doctor";

    //             const admissionDate = formatDate(admissionWithDetails?.admissionDateTime ?? new Date());
    //             const admissionTime = formatTime(admissionWithDetails?.admissionDateTime ?? new Date());

    //             const roomNumber = admissionWithDetails?.staySession?.currentRoomBooking?.room?.roomNumber ?? "N/A";

    //             const referral = admissionWithDetails?.reference;
    //             const referralSource = referral?.referralName ?? "Direct";

    //             const patientAge = admissionWithDetails?.patient?.age ?? "N/A";
    //             const patientGender = admissionWithDetails?.patient?.gender ?? "N/A";

    //             const managingPersonPhone = process.env.HMS_MANAGING_PERSON_PHONE!;

    //             // 1. Notify Patient
    //             if (patientPhone) {
    //                 const patientInfoId = admissionWithDetails?.patient?.id; // PatientInfo.id e.g. "PAT000039"
    //                 const portalLink = patientInfoId ? getPatientPortalLink(patientInfoId) : "";

    //                 await sendNotification(patientPhone, admissionPatientMessage(patientName, admissionDate, admissionTime, roomNumber, doctorName, portalLink));
    //             }

    //             // 2. Notify Doctor
    //             if (doctorPhone) {
    //                 await sendNotification(doctorPhone, admissionDoctorMessage(doctorName, patientName, patientAge, patientGender, admissionDate, admissionTime, roomNumber, referralSource));
    //             }

    //             // 3. Notify Referrer (only if referral exists and is not NONE)
    //             if (referral?.referralContact && referral?.referralType !== "NONE" && referral?.referralType !== null) {
    //                 await sendNotification(referral.referralContact, admissionReferrerMessage(referral.referralName ?? "Doctor", patientName, admissionDate, doctorName));
    //             }

    //             // 4. Notify Managing Person
    //             if (managingPersonPhone) {
    //                 await sendNotification(managingPersonPhone, admissionManagingPersonMessage(patientName, admissionDate, admissionTime, doctorName, roomNumber, referralSource));
    //             }
    //         } catch (notifError) {
    //             console.error("[Notification] Admission notification failed:", notifError);
    //         }
    //         // ── End Admission Notifications ──

    //         return apiSuccess(res, {
    //             data: admission,
    //             message: "Patient admitted successfully",
    //         });
    //     } catch (error) {
    //         console.error("[admitPatient] Error:", error instanceof Error ? error.stack || error.message : error);
    //         return apiError(res, {
    //             statusCode: "INTERNAL_SERVER_ERROR",
    //             message: error instanceof Error ? error.message : "Unable to admit patient",
    //         });
    //     }
    // },
    async admitPatient(req: Request, res: Response) {
        try {
            const body: AdmitPatient = req.body;

            // Validate doctor
            const doctor = await prisma.employeeInfo.findUnique({
                where: { id: body.admittingDoctorId },
            });
            if (!doctor) {
                return apiError(res, { message: "Admitting doctor not found" });
            }

            // Admission identity validation
            let checkFName: string | undefined = undefined;
            let checkLName: string | undefined = undefined;
            let checkPhone: string | undefined = undefined;

            if (body.patientId) {
                const existingPatientForCheck = await prisma.patientInfo.findUnique({
                    where: { id: body.patientId },
                    include: { user: true },
                });
                if (!existingPatientForCheck) {
                    return apiError(res, { message: "Patient not found" });
                }
                checkFName = existingPatientForCheck.user?.fName ?? undefined;
                checkLName = existingPatientForCheck.user?.lName ?? undefined;
                checkPhone = existingPatientForCheck.user?.phoneNumber ?? existingPatientForCheck.phoneNumber ?? undefined;
            } else if (body.patientInfo) {
                checkFName = body.patientInfo.fName;
                checkLName = body.patientInfo.lName;
                checkPhone = body.patientInfo.phoneNumber;
            }

            if (checkFName && checkPhone) {
                const matchingUsers = await prisma.user.findMany({
                    where: { fName: checkFName, lName: checkLName, phoneNumber: checkPhone },
                    select: { id: true },
                });
                if (matchingUsers.length > 0) {
                    const userIds = matchingUsers.map((u) => u.id);
                    const matchingPatients = await prisma.patientInfo.findMany({
                        where: { userId: { in: userIds } },
                        select: { id: true },
                    });
                    const patientIdsToCheck = matchingPatients.map((p) => p.id);
                    if (patientIdsToCheck.length > 0) {
                        const activeCount = await prisma.admission.count({
                            where: {
                                patientId: { in: patientIdsToCheck },
                                status: { notIn: [AdmissionStatus.DISCHARGED, AdmissionStatus.CANCELLED] },
                            },
                        });
                        if (activeCount > 0) {
                            return apiError(res, {
                                message: "Patient already has an active admission. Please discharge before admitting again.",
                            });
                        }
                    }
                }
            }

            const normalizedBloodGroup = normalizeBloodGroup(body.patientInfo?.bloodGroup);

            const admission = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                let patientId = body.patientId;
                let patientUser: any;

                // --- 1. Create or fetch PatientInfo & User ---
                if (!patientId && body.patientInfo) {
                    let user = await tx.user.findFirst({
                        where: {
                            AND: [{ email: body.patientInfo.email }, { phoneNumber: body.patientInfo.phoneNumber }, { fName: body.patientInfo.fName }, { lName: body.patientInfo.lName }],
                        },
                    });

                    if (!user) {
                        user = await tx.user.create({
                            data: {
                                email: body.patientInfo.email,
                                fName: body.patientInfo.fName,
                                lName: body.patientInfo.lName,
                                phoneNumber: body.patientInfo.phoneNumber,
                                bloodGroup: normalizedBloodGroup,
                                isPatient: true,
                            },
                        });
                    } else if (!user.isPatient) {
                        user = await tx.user.update({
                            where: { id: user.id },
                            data: { isPatient: true },
                        });
                    }

                    patientUser = user;

                    let patientInfo = await tx.patientInfo.findUnique({
                        where: { userId: user.id },
                    });

                    if (!patientInfo) {
                        const { uniqueId: patientInfoId } = await generateOrganizationScopedId(tx, "PATIENT");
                        patientInfo = await tx.patientInfo.create({
                            data: {
                                id: patientInfoId,
                                userId: user.id,
                                gender: body.patientInfo.gender,
                                age: body.patientInfo.age,
                            },
                        });
                    }
                    patientId = patientInfo.id;
                } else if (patientId) {
                    // Existing patient
                    const existingPatient = await tx.patientInfo.findUnique({
                        where: { id: patientId },
                        include: { user: true },
                    });
                    if (!existingPatient) {
                        throw new Error("Patient not found");
                    }
                    if (!existingPatient.user) {
                        throw new Error("Patient record exists but has no associated user");
                    }
                    patientUser = existingPatient.user;

                    if (body.patientInfo) {
                        if (body.patientInfo.age !== undefined || body.patientInfo.gender !== undefined) {
                            await tx.patientInfo.update({
                                where: { id: patientId },
                                data: {
                                    ...(body.patientInfo.age !== undefined && { age: body.patientInfo.age }),
                                    ...(body.patientInfo.gender !== undefined && { gender: body.patientInfo.gender }),
                                },
                            });
                        }
                        if (
                            body.patientInfo.fName !== undefined ||
                            body.patientInfo.lName !== undefined ||
                            body.patientInfo.phoneNumber !== undefined ||
                            body.patientInfo.email !== undefined ||
                            body.patientInfo.bloodGroup !== undefined
                        ) {
                            await tx.user.update({
                                where: { id: patientUser.id },
                                data: {
                                    ...(body.patientInfo.fName !== undefined && { fName: body.patientInfo.fName }),
                                    ...(body.patientInfo.lName !== undefined && { lName: body.patientInfo.lName }),
                                    ...(body.patientInfo.phoneNumber !== undefined && { phoneNumber: body.patientInfo.phoneNumber }),
                                    ...(body.patientInfo.email !== undefined && { email: body.patientInfo.email }),
                                    ...(body.patientInfo.bloodGroup !== undefined && { bloodGroup: normalizedBloodGroup }),
                                },
                            });
                        }
                    }
                } else {
                    throw new Error("Either patientId or patientInfo is required");
                }

                // --- 2. Update Patient Info (Insurance & Emergency) ---
                const updateData: any = {};
                if (body.insuranceInfo) {
                    updateData.insuranceProvider = body.insuranceInfo.insuranceProvider;
                    updateData.policyNumber = body.insuranceInfo.policyNumber;
                    updateData.policyHolderName = body.insuranceInfo.policyHolderName;
                    updateData.policyExpiryDate = body.insuranceInfo.policyExpiryDate;
                    updateData.tpaName = body.insuranceInfo.tpaName;
                }
                if (body.emergencyContact) {
                    updateData.emergencyContactName = body.emergencyContact.name;
                    updateData.emergencyContact = body.emergencyContact.contact;
                    updateData.emergencyContactNotes = body.emergencyContact.notes;
                }
                if (Object.keys(updateData).length > 0) {
                    await tx.patientInfo.update({
                        where: { id: patientId },
                        data: updateData,
                    });
                }

                // --- 3. Create Admission record ---
                const newAdmission = await tx.admission.create({
                    data: {
                        patientId: patientId!,
                        admittingDoctorId: body.admittingDoctorId,
                        admissionDateTime: body.admissionDateTime || new Date(),
                        expectedDischarge: body.expectedDischarge,
                        reason: body.reason,
                        sourceType: body.sourceType as AdmissionSourceType,
                        sourceAppointmentId: body.sourceAppointmentId,
                        sourceVisitId: body.sourceVisitId,
                        status: body.sourceType === "FROM_EMERGENCY" ? "ADMITTED" : "PLANNED",
                        paymentType: body.paymentType,
                        amount: body.amount,
                        txnId: body.paymentType === "UPI" || body.paymentType === "CARD" ? body.txnId : undefined,
                    },
                });

                // --- 4. Handle room assignment (if provided) ---
                if (body.roomId) {
                    const freshRoom = await tx.room.findUnique({
                        where: { id: body.roomId },
                    });
                    if (!freshRoom) {
                        throw new Error("Room not found");
                    }
                    if (freshRoom.status !== RoomStatus.AVAILABLE) {
                        throw new Error("Room is not available");
                    }

                    const bookingStart = body.admissionDateTime || new Date();

                    // Create room booking
                    const roomBooking = await tx.roomBooking.create({
                        data: {
                            roomId: body.roomId,
                            patientId: patientId!,
                            doctorId: doctor.userId,
                            startTime: bookingStart,
                            status: "CONFIRMED",
                            title: `Admission for ${patientUser.fName} ${patientUser.lName}`,
                            description: "Inpatient Admission",
                            roomCharges: body.roomCharges || 0,
                        },
                    });

                    // Create inpatient stay session
                    await tx.inpatientStaySession.create({
                        data: {
                            admissionId: newAdmission.id,
                            patientId: patientId!,
                            currentRoomBookingId: roomBooking.id,
                            startedAt: bookingStart,
                            status: "ACTIVE",
                        },
                    });

                    const newOccupancy = freshRoom.currentOccupancy + 1;
                    const newStatus = freshRoom.capacity === newOccupancy ? RoomStatus.OCCUPIED : RoomStatus.AVAILABLE;

                    await tx.room.update({
                        where: { id: body.roomId },
                        data: {
                            status: newStatus,
                            currentOccupancy: newOccupancy,
                        },
                    });

                    // Add room charge to bill (needs freshRoom for roomTypeId)
                    try {
                        await addItemToBill({
                            patientId: patientId!,
                            entityId: freshRoom.roomTypeId,
                            entityType: BillItemType.ROOM,
                            tx,
                            title: `Room Charges: ${freshRoom.roomNumber}`,
                            billType: "IPD",
                            admissionId: newAdmission.id,
                        });
                    } catch (billingError) {
                        console.warn("[admitPatient] Skipped billing item creation:", billingError instanceof Error ? billingError.message : billingError);
                    }
                }

                // --- 5. Create referral if provided ---
                if (body.referralInfo && body.referralInfo.referralType !== ReferralType.NONE) {
                    await tx.reference.create({
                        data: {
                            patientId: patientId!,
                            referralName: body.referralInfo.referralName,
                            referralContact: body.referralInfo.referralContact,
                            referralType: body.referralInfo.referralType,
                            concessionPercentage: body.referralInfo.concessionPercentage,
                            admissionId: newAdmission.id,
                            referralEmployeeId: body.referralInfo.referralEmployeeId,
                            referralId: body.referralInfo.referralId,
                        },
                    });
                }

                // --- 6. Process deposit amount (if any) ---
                if (body.amount && parseFloat(body.amount) > 0) {
                    const depositAmount = parseFloat(body.amount);

                    // Create payment receipt
                    const receiptNumber = await generateReceiptNumber();
                    await tx.paymentDetails.create({
                        data: {
                            patientId: patientId!,
                            admissionId: newAdmission.id,
                            paymentType: body.paymentType || "OTHER",
                            paymentStatus: "PAID",
                            amount: body.amount,
                            txnId: body.txnId || null,
                            receiptNumber,
                            notes: "Deposit amount paid during admission",
                        },
                    });

                    // Find or create IPD bill
                    let bill = await tx.bill.findFirst({
                        where: {
                            patientId: patientId!,
                            type: "IPD",
                            admissionId: newAdmission.id,
                            status: { in: [BillStatus.DRAFT, BillStatus.ACTIVE, BillStatus.PARTIAL] },
                        },
                        orderBy: { createdAt: "desc" },
                    });

                    if (!bill) {
                        bill = await tx.bill.create({
                            data: {
                                patientId: patientId!,
                                type: "IPD",
                                admissionId: newAdmission.id,
                                status: BillStatus.ACTIVE,
                                notes: "System generated IPD bill",
                            },
                        });
                    }

                    // Create payment linked to the bill
                    await tx.payment.create({
                        data: {
                            billId: bill.id,
                            amount: depositAmount,
                            paymentMethod: body.paymentType || PaymentType.OTHER,
                            type: PaymentFlowType.ADVANCE,
                            txId: body.txnId || null,
                            notes: "Deposit amount paid during admission",
                        },
                    });

                    // Update bill status based on totals (optional, kept as in original)
                    const fullBill = await tx.bill.findUnique({
                        where: { id: bill.id },
                        include: {
                            items: {
                                where: { status: BillItemStatus.ACTIVE },
                                include: { billAdjustments: { where: { active: true } } },
                            },
                            adjustments: { where: { active: true } },
                            payments: true,
                        },
                    });

                    if (fullBill) {
                        let totalItemsAmount = 0;
                        fullBill.items.forEach((item: any) => {
                            const itemSubtotal = item.unitPrice * item.quantity;
                            const taxAmount = (itemSubtotal * (item.taxPercent || 0)) / 100;
                            const itemAdjustments = item.billAdjustments.reduce((sum: number, adj: any) => {
                                const val = adj.mode === "PERCENTAGE" ? (itemSubtotal * adj.value) / 100 : adj.value;
                                return adj.type === "EXTRA_CHARGE" ? sum + val : sum - val;
                            }, 0);
                            totalItemsAmount += itemSubtotal + taxAmount + itemAdjustments;
                        });

                        const billAdjustmentsTotal = fullBill.adjustments.reduce((sum: number, adj: any) => {
                            const val = adj.mode === "PERCENTAGE" ? (totalItemsAmount * adj.value) / 100 : adj.value;
                            return adj.type === "EXTRA_CHARGE" ? sum + val : sum - val;
                        }, 0);

                        const totalPayable = totalItemsAmount + billAdjustmentsTotal;
                        const totalPaid = fullBill.payments.reduce((sum: number, p: any) => sum + p.amount, 0);

                        let newStatus = fullBill.status;
                        if (totalPaid >= totalPayable && totalPayable > 0) {
                            newStatus = BillStatus.PAID;
                        } else if (totalPaid > 0) {
                            newStatus = BillStatus.PARTIAL;
                        } else if (fullBill.status === BillStatus.PAID || fullBill.status === BillStatus.PARTIAL) {
                            newStatus = BillStatus.ACTIVE;
                        }

                        if (newStatus !== fullBill.status) {
                            await tx.bill.update({
                                where: { id: bill.id },
                                data: { status: newStatus },
                            });
                        }
                    }
                }

                return newAdmission;
            }); // end transaction

            // --- Create medical history entry (outside transaction, safe to fail) ---
            try {
                await prisma.medicalHistory.create({
                    data: {
                        admissionId: admission.id,
                        patientId: admission.patientId,
                    },
                });
            } catch (medicalHistoryError) {
                console.warn("[admitPatient] Skipped medicalHistory.create:", medicalHistoryError instanceof Error ? medicalHistoryError.message : medicalHistoryError);
            }

            // --- Send notifications (outside transaction, errors do not rollback admission) ---
            try {
                const admissionWithDetails = await prisma.admission.findUnique({
                    where: { id: admission.id },
                    include: {
                        patient: {
                            include: {
                                user: { select: { fName: true, lName: true, phoneNumber: true } },
                            },
                        },
                        admittingDoctor: {
                            include: {
                                user: { select: { fName: true, lName: true, phoneNumber: true } },
                            },
                        },
                        reference: {
                            select: { referralName: true, referralContact: true, referralType: true },
                        },
                        staySession: {
                            include: {
                                currentRoomBooking: {
                                    include: {
                                        room: { select: { roomNumber: true } },
                                    },
                                },
                            },
                        },
                    },
                });

                const patientUser = admissionWithDetails?.patient?.user;
                const patientPhone = admissionWithDetails?.patient?.phoneNumber ?? patientUser?.phoneNumber;
                const patientName = patientUser ? `${patientUser.fName} ${patientUser.lName}`.trim() : "Patient";

                const doctorUser = admissionWithDetails?.admittingDoctor?.user;
                const doctorPhone = doctorUser?.phoneNumber;
                const doctorName = doctorUser ? `${doctorUser.fName} ${doctorUser.lName}`.trim() : "Doctor";

                const admissionDate = formatDate(admissionWithDetails?.admissionDateTime ?? new Date());
                const admissionTime = formatTime(admissionWithDetails?.admissionDateTime ?? new Date());
                const roomNumber = admissionWithDetails?.staySession?.currentRoomBooking?.room?.roomNumber ?? "N/A";
                const referral = admissionWithDetails?.reference;
                const referralSource = referral?.referralName ?? "Direct";
                const patientAge = admissionWithDetails?.patient?.age ?? "N/A";
                const patientGender = admissionWithDetails?.patient?.gender ?? "N/A";
                const managingPersonPhone = process.env.HMS_MANAGING_PERSON_PHONE!;

                if (patientPhone) {
                    const portalLink = getPatientPortalLink(admissionWithDetails?.patient?.id!);
                    await sendNotification(patientPhone, admissionPatientMessage(patientName, admissionDate, admissionTime, roomNumber, doctorName, portalLink));
                }
                if (doctorPhone) {
                    await sendNotification(doctorPhone, admissionDoctorMessage(doctorName, patientName, patientAge, patientGender, admissionDate, admissionTime, roomNumber, referralSource));
                }
                if (referral?.referralContact && referral.referralType !== "NONE" && referral.referralType !== null) {
                    await sendNotification(referral.referralContact, admissionReferrerMessage(referral.referralName ?? "Doctor", patientName, admissionDate, doctorName));
                }
                if (managingPersonPhone) {
                    await sendNotification(managingPersonPhone, admissionManagingPersonMessage(patientName, admissionDate, admissionTime, doctorName, roomNumber, referralSource));
                }
            } catch (notifError) {
                console.error("[admitPatient] Admission notification failed:", notifError);
            }

            return apiSuccess(res, {
                data: admission,
                message: "Patient admitted successfully",
            });
        } catch (error) {
            console.error("[admitPatient] Error:", error instanceof Error ? error.stack || error.message : error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: error instanceof Error ? error.message : "Unable to admit patient",
            });
        }
    },
    async bookAppointment(req, res) {
        try {
            const body: BookAppointment = req.body;
            const isFollowUp = !!body.appointmentId;

            let resolvedDoctorId = body.doctorId;
            let resolvedAppointmentDate = body.appointmentDate;

            if (isFollowUp) {
                const originalAppointment = await prisma.appointment.findUnique({
                    where: { id: body.appointmentId, status: "COMPLETED" },
                });

                if (!originalAppointment) {
                    return apiError(res, {
                        error: "Original appointment not found for follow-up.",
                    });
                }
                if (body.sourceAdmissionId) {
                    const originalAdmission = await prisma.admission.findUnique({
                        where: { id: body.sourceAdmissionId, status: "DISCHARGED" },
                    });
                    if (!originalAdmission) {
                        return apiError(res, {
                            error: "Original admission not found for follow-up.",
                        });
                    }
                }
                const organization = await prisma.organization.findFirst({
                    select: {
                        consultationSpan: true,
                        consultationAttempts: true,
                    },
                });

                const followUpDays = organization?.consultationSpan ?? 15;
                const attempts = organization?.consultationAttempts ?? 1;

                const appointmentDate = new Date(originalAppointment.appointmentDate);
                const lastFollowUpDate = new Date(appointmentDate);
                lastFollowUpDate.setDate(lastFollowUpDate.getDate() + followUpDays);

                const today = new Date();

                if (today > lastFollowUpDate) {
                    return apiError(res, {
                        message: "Follow-up expired. Please create a new appointment.",
                    });
                }

                if (resolvedAppointmentDate) {
                    const selectedDate = new Date(resolvedAppointmentDate);
                    selectedDate.setHours(0, 0, 0, 0);
                    const followUpDeadline = new Date(lastFollowUpDate);
                    followUpDeadline.setHours(0, 0, 0, 0);
                    if (selectedDate > followUpDeadline) {
                        return apiError(res, {
                            message: `Follow-up appointment must be booked on or before ${followUpDeadline.toDateString()}. Please create a new appointment for dates beyond this.`,
                        });
                    }
                }

                const recentAppointments = await prisma.appointment.findMany({
                    where: { patientId: originalAppointment.patientId },
                    orderBy: { appointmentDate: "desc" },
                    take: 1,
                });

                if (
                    recentAppointments[0]?.appointmentType === "FOLLOW_UP" &&
                    (recentAppointments[0].status === "IN_PROGRESS" || recentAppointments[0].status === "CONFIRMED" || recentAppointments[0].status === "COMPLETED")
                ) {
                    return apiError(res, {
                        message: "Already created follow-up appointment. Please create a new appointment.",
                    });
                }

                const followUpCount = await prisma.appointment.count({
                    where: {
                        patientId: originalAppointment.patientId,
                        appointmentType: "FOLLOW_UP",
                        status: { notIn: ["CANCELLED"] },
                    },
                });

                if (followUpCount >= attempts) {
                    return apiError(res, {
                        message: "Follow-up attempts exhausted. Please create a new appointment.",
                    });
                }

                resolvedDoctorId = resolvedDoctorId || originalAppointment.doctorId;
                resolvedAppointmentDate = resolvedAppointmentDate || new Date();
            }

            if (!resolvedDoctorId) {
                return apiError(res, { error: "Doctor ID is required." });
            }

            const referralType = body.referralInfo?.referralType;

            if (referralType !== ReferralType.INTERNAL) {
                if (body.referralInfo && referralType !== ReferralType.NONE && !body.referralInfo.referralId) {
                    const referralErrors: {
                        referralName?: string;
                        referralContact?: string;
                    } = {};

                    if (!body.referralInfo.referralName?.trim()) {
                        referralErrors.referralName = "Referral name is not entered";
                    }
                    if (!body.referralInfo.referralContact?.trim()) {
                        referralErrors.referralContact = "Referral phone number is not entered";
                    }

                    if (Object.keys(referralErrors).length > 0) {
                        return apiError(res, {
                            statusCode: "BAD_REQUEST",
                            message: Object.values(referralErrors).join(". "),
                        });
                    }
                }
            }

            // Check if doctor exists (by employeeInfo.id, then by userId, or fallback to first available doctor)
            let foundDoctor = await prisma.employeeInfo.findUnique({
                where: { id: resolvedDoctorId },
            });

            if (!foundDoctor) {
                foundDoctor = await prisma.employeeInfo.findFirst({
                    where: { userId: resolvedDoctorId },
                });
            }

            if (!foundDoctor) {
                foundDoctor = await prisma.employeeInfo.findFirst();
            }

            if (!foundDoctor) {
                return res.status(404).json({ message: "Selected doctor does not exist." });
            }
            resolvedDoctorId = foundDoctor.id;

            const newAppointment = await prisma.$transaction(async (tx) => {
                let patientInfoRecord: any;

                // --- Resolve Patient ---
                if (body.patientId) {
                    // EXISTING PATIENT: Look up by patientId
                    patientInfoRecord = await tx.patientInfo.findUnique({
                        where: { id: body.patientId },
                        include: { user: true },
                    });

                    if (!patientInfoRecord) {
                        throw new Error("Patient not found with the provided patientId.");
                    }

                    // If patientInfo is also provided, update the existing patient record
                    if (body.patientInfo) {
                        await tx.user.update({
                            where: { id: patientInfoRecord.userId },
                            data: {
                                fName: body.patientInfo.fName,
                                lName: body.patientInfo.lName,
                                bloodGroup: (body.patientInfo.bloodGroup as BloodGroupType) || undefined,
                                email: body.patientInfo.email || undefined,
                                phoneNumber: body.patientInfo.phoneNumber || undefined,
                            },
                        });
                        patientInfoRecord = await tx.patientInfo.update({
                            where: { id: body.patientId },
                            data: {
                                gender: body.patientInfo.gender,
                                age: body.patientInfo.age,
                                email: body.patientInfo.email,
                                phoneNumber: body.patientInfo.phoneNumber,
                            },
                        });
                    }
                } else if (body.patientInfo) {
                    const existingName = await tx.user.findFirst({
                        where: {
                            fName: body.patientInfo.fName,
                            lName: body.patientInfo.lName,
                            isPatient: true,
                        },
                    });

                    const existingPhone = body.patientInfo.phoneNumber
                        ? await tx.user.findFirst({
                              where: {
                                  phoneNumber: body.patientInfo.phoneNumber,
                                  isPatient: true,
                              },
                          })
                        : null;

                    // if (existingPhone) {
                    //     return apiError(res, {
                    //         statusCode: "CONFLICT",
                    //         message: "A patient with this phone number already exists",
                    //     });
                    // }

                    // const existingEmail = body.patientInfo.email
                    //     ? await tx.user.findFirst({
                    //           where: { email: body.patientInfo.email, isPatient: true },
                    //       })
                    //     : null;

                    // if (existingEmail) {
                    //     return apiError(res, {
                    //         statusCode: "CONFLICT",
                    //         message: "A patient with this email already exists",
                    //     });
                    // }

                    // if (existingName) {
                    //     return apiError(res, {
                    //         statusCode: "CONFLICT",
                    //         message: "A patient with this name already exists",
                    //     });
                    // }

                    let user = await tx.user.findFirst({
                        where: {
                            AND: [{ email: body.patientInfo.email }, { phoneNumber: body.patientInfo.phoneNumber }, { fName: body.patientInfo.fName }, { lName: body.patientInfo.lName }],
                        },
                    });

                    let parsedBloodGroup: BloodGroupType | null = null;
                    if (body.patientInfo.bloodGroup) {
                        const bgMap: Record<string, BloodGroupType> = {
                            "A+": "A_PLUS" as BloodGroupType,
                            "A-": "A_MINUS" as BloodGroupType,
                            "B+": "B_PLUS" as BloodGroupType,
                            "B-": "B_MINUS" as BloodGroupType,
                            "AB+": "AB_PLUS" as BloodGroupType,
                            "AB-": "AB_MINUS" as BloodGroupType,
                            "O+": "O_PLUS" as BloodGroupType,
                            "O-": "O_MINUS" as BloodGroupType,
                        };
                        parsedBloodGroup = bgMap[body.patientInfo.bloodGroup] || (body.patientInfo.bloodGroup as BloodGroupType) || null;
                    }

                    if (!user) {
                        user = await tx.user.create({
                            data: {
                                fName: body.patientInfo.fName,
                                lName: body.patientInfo.lName,
                                bloodGroup: parsedBloodGroup,
                                isPatient: true,
                                email: body.patientInfo.email,
                                phoneNumber: body.patientInfo.phoneNumber,
                            },
                        });
                    } else if (!user.isPatient) {
                        user = await tx.user.update({
                            where: { id: user.id },
                            data: { isPatient: true },
                        });
                    }

                    // Prepare patient info data
                    const patientInfoData: Prisma.PatientInfoCreateInput = {
                        user: { connect: { id: user.id } },
                        gender: body.patientInfo.gender,
                        age: body.patientInfo.age,
                        email: body.patientInfo.email,
                        phoneNumber: body.patientInfo.phoneNumber,
                    };

                    // Create or update patient info
                    patientInfoRecord = await tx.patientInfo.findUnique({
                        where: { userId: user.id },
                    });

                    if (!patientInfoRecord) {
                        const { uniqueId: patientId } = await generateOrganizationScopedId(tx, "PATIENT");
                        patientInfoRecord = await tx.patientInfo.create({
                            data: {
                                id: patientId,
                                ...patientInfoData,
                            },
                        });
                    } else {
                        patientInfoRecord = await tx.patientInfo.update({
                            where: { userId: user.id },
                            data: patientInfoData,
                        });
                    }
                } else {
                    throw new Error("Either patientId or patientInfo is required");
                }

                // --- Create Appointment ---
                // const newAppointment = await tx.appointment.create({
                //     data: {
                //         appointmentDate: resolvedAppointmentDate!,
                //         startTime: body.startTime || new Date(),
                //         endTime: body.endTime,
                //         appointmentType: body.appointmentId ? "FOLLOW_UP" : "NEW_APPOINTMENT",
                //         status: AppointmentStatus.IN_PROGRESS,
                //         patientId: patientInfoRecord.id,
                //         doctorId: resolvedDoctorId!,
                //         reason: body.reason,
                //     },
                //     include: {
                //         patient: {
                //             include: {
                //                 user: true,
                //             },
                //         },
                //         doctor: true,
                //         referral: {
                //             include: {
                //                 referralEmployee: true,
                //             },
                //         },
                //     },
                // });
                const appointmentData: any = {
                    appointmentDate: resolvedAppointmentDate,
                    startTime: body.startTime || new Date(),
                    endTime: body.endTime,
                    appointmentType: body.appointmentId ? "FOLLOW_UP" : "NEW_APPOINTMENT",
                    status: AppointmentStatus.IN_PROGRESS,
                    patientId: patientInfoRecord.id,
                    doctorId: resolvedDoctorId,
                    reason: body.reason,
                };

                // Handle sourceAdmission linkage based on sourceAdmissionType
                if (body.sourceAdmissionId) {
                    // Optional: Validate that the admission exists and belongs to this patient
                    const admission = await tx.admission.findUnique({
                        where: { id: body.sourceAdmissionId },
                        select: { patientId: true, status: true },
                    });
                    if (!admission) {
                        throw new Error("Admission not found for IPD linkage");
                    }
                    if (admission.patientId !== patientInfoRecord.id) {
                        throw new Error("Admission does not belong to this patient");
                    }
                    // Optional: restrict to discharged admissions only
                    if (admission.status !== "DISCHARGED") {
                        throw new Error("Cannot link appointment to an active admission");
                    }
                    appointmentData.sourceAdmissionId = body.sourceAdmissionId;
                }

                // --- Create the appointment ---
                const newAppointment = await tx.appointment.create({
                    data: appointmentData,
                    include: {
                        patient: {
                            include: { user: true },
                        },
                        doctor: true,
                        referral: {
                            include: { referralEmployee: true },
                        },
                    },
                });
                await tx.medicalHistory.create({
                    data: {
                        appointmentId: newAppointment.id,
                        patientId: patientInfoRecord.id,
                    },
                });

                // --- Create Referral (if provided) ---
                if (body.referralInfo && body.referralInfo?.referralType !== ReferralType.NONE) {
                    await tx.reference.create({
                        data: {
                            patientId: patientInfoRecord.id,
                            referralName: body.referralInfo.referralName,
                            referralContact: body.referralInfo.referralContact,
                            referralType: body.referralInfo.referralType,
                            concessionPercentage: body.referralInfo.concessionPercentage,
                            appointmentId: newAppointment.id,
                            referralEmployeeId: body.referralInfo.referralEmployeeId,
                            referralId: body.referralInfo.referralId,
                        },
                    });
                }

                return newAppointment;
            });

            return apiSuccess(res, {
                data: newAppointment,
                message: "Appointment booked successfully",
            });
        } catch (error) {
            console.error("DEBUG BOOK APPOINTMENT ERROR:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to book appointment",
            });
        }
    },
    async getAllAppointments(req, res) {
        try {
            const { status, appointmentDate, patientName, doctorName, phoneNumber, page = "1", limit = "10" } = req.query;

            const pageNum = Math.max(1, parseInt(String(page)) || 1);
            const limitNum = Math.max(1, parseInt(String(limit)) || 10);
            const skip = (pageNum - 1) * limitNum;
            const whereCondition: Prisma.AppointmentWhereInput = {};
            const filters: Prisma.AppointmentWhereInput[] = [];

            if (status) {
                const validStatuses: AppointmentStatus[] = ["CONFIRMED", "CANCELLED", "IN_PROGRESS", "COMPLETED", "SCHEDULED"];

                let searchForStatus = (status as string).toLowerCase().trim();

                const normalizedSearch = searchForStatus.replace(/[\s_]/g, "");

                const matchingStatuses = validStatuses.filter((validStatus) => {
                    const lowerStatus = validStatus.toLowerCase();
                    const normalizedStatus = lowerStatus.replace(/[\s_]/g, "");
                    return normalizedStatus.includes(normalizedSearch);
                });

                if (matchingStatuses.length > 0) {
                    filters.push({
                        status: {
                            in: matchingStatuses,
                        },
                    });
                } else {
                    // No matching status, return empty result
                    filters.push({
                        status: {
                            in: [],
                        },
                    });
                }
            }
            // if (appointmentDate) {
            //     filters.push({ appointmentDate: { gte: new Date(appointmentDate as string) } });
            // }
            if (appointmentDate) {
                // Parse the date string and create a date range for that specific day
                const dateStr = appointmentDate as string;
                const date = new Date(dateStr);

                // Method 1: Using date range
                const startDate = new Date(date);
                startDate.setUTCHours(0, 0, 0, 0);

                const endDate = new Date(date);
                endDate.setUTCHours(23, 59, 59, 999);

                filters.push({
                    appointmentDate: {
                        gte: startDate,
                        lte: endDate,
                    },
                });
            }
            if (patientName) {
                const searchTerm = patientName as string;
                const searchTerms = searchTerm
                    .trim()
                    .split(/\s+/)
                    .filter((term) => term.length > 0);

                if (searchTerms.length > 0) {
                    const termConditions: Prisma.AppointmentWhereInput[] = searchTerms.map((term) => ({
                        patient: {
                            user: {
                                OR: [{ fName: { contains: term, mode: "insensitive" } }, { lName: { contains: term, mode: "insensitive" } }],
                            },
                        },
                    }));

                    filters.push({ AND: termConditions });
                }
            }

            if (doctorName) {
                const searchTerm = doctorName as string;
                const searchTerms = searchTerm
                    .trim()
                    .split(/\s+/)
                    .filter((term) => term.length > 0);

                if (searchTerms.length > 0) {
                    const termConditions: Prisma.AppointmentWhereInput[] = searchTerms.map((term) => ({
                        patient: {
                            user: {
                                OR: [{ fName: { contains: term, mode: "insensitive" } }, { lName: { contains: term, mode: "insensitive" } }],
                            },
                        },
                    }));

                    filters.push({ AND: termConditions });
                }
            }

            if (phoneNumber) {
                filters.push({
                    patient: {
                        user: {
                            phoneNumber: {
                                contains: phoneNumber as string,
                                mode: "insensitive",
                            },
                        },
                    },
                });
            }

            if (filters.length > 0) {
                whereCondition.AND = filters;
            }

            const [appointments, total] = await Promise.all([
                prisma.appointment.findMany({
                    where: whereCondition,
                    skip,
                    take: limitNum,
                    select: {
                        id: true,
                        appointmentDate: true,
                        startTime: true,
                        endTime: true,
                        status: true,
                        reason: true,
                        // patientType: true,
                        appointmentType: true,
                        paidAmount: true,
                        patient: {
                            select: {
                                id: true,
                                age: true,
                                gender: true,
                                user: {
                                    select: {
                                        id: true,
                                        email: true,
                                        fName: true,
                                        lName: true,
                                        phoneNumber: true,
                                        bloodGroup: true,
                                    },
                                },
                            },
                        },
                        doctor: {
                            select: {
                                id: true,
                                user: {
                                    select: {
                                        id: true,
                                        email: true,
                                        fName: true,
                                        lName: true,
                                        phoneNumber: true,
                                    },
                                },
                            },
                        },
                        referral: {
                            select: {
                                id: true,
                                referralName: true,
                                referralContact: true,
                                referralType: true,
                                concessionPercentage: true,
                                appointmentId: true,
                                referralEmployeeId: true,
                            },
                        },
                        visits: {
                            select: {
                                id: true,
                            },
                        },
                    },
                    orderBy: [{ startTime: "desc" }, { appointmentDate: "desc" }],
                }),
                prisma.appointment.count({ where: whereCondition }),
            ]);

            // const sortedAppointments = appointments.sort((a, b) => {
            //     // Define priority order
            //     const statusPriority = {
            //         IN_PROGRESS: 1,
            //         CONFIRMED: 2,
            //         COMPLETED: 3,
            //         CANCELLED: 4,
            //         SCHEDULED: 5,
            //         NO_SHOW: 6,
            //     };

            //     // Get priority values (default to highest number if status not found)
            //     const priorityA = statusPriority[a.status] || 999;
            //     const priorityB = statusPriority[b.status] || 999;

            //     // Compare by status priority first
            //     if (priorityA !== priorityB) {
            //         return priorityA - priorityB;
            //     }

            //     // If same status priority, then sort by appointment date descending
            //     const dateA = new Date(a.appointmentDate).getTime();
            //     const dateB = new Date(b.appointmentDate).getTime();
            //     if (dateA !== dateB) return dateB - dateA;

            //     // Finally by status as string (though this shouldn't be needed now)
            //     return a.status.localeCompare(b.status);
            // });
            const enrichedAppointments = await Promise.all(
                appointments.map(async (appt) => {
                    const apptAny = appt as any;
                    if (apptAny.doctor?.user?.id) {
                        apptAny.doctor.consultationCharge = await getActivePriceAmount(PriceEntityType.DOCTOR_CONSULTATION, apptAny.doctor.id);
                    }
                    return apptAny;
                }),
            );
            return apiSuccess(res, {
                data: enrichedAppointments,
                message: "Appointments retrieved successfully",
                metadata: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(total / limitNum),
                    totalItems: total,
                    itemsPerPage: limitNum,
                    hasNextPage: pageNum < Math.ceil(total / limitNum),
                    hasPrevPage: pageNum > 1,
                },
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to retrieve appointments",
            });
        }
    },
    async getAllAdmissions(req, res) {
        try {
            const { page = 1, limit = 10, search, filterType, date } = req.query;
            const pageNum = parseInt(page as string);
            const limitNum = parseInt(limit as string);
            const skip = (pageNum - 1) * limitNum;

            // Build where condition with AND for multiple filters
            const andConditions: Prisma.AdmissionWhereInput[] = [];

            // Handle date search
            if (date) {
                const parsedDate = new Date(date as string);

                if (!isNaN(parsedDate.getTime())) {
                    const startDate = new Date(parsedDate);
                    startDate.setUTCHours(0, 0, 0, 0);

                    const endDate = new Date(parsedDate);
                    endDate.setUTCHours(23, 59, 59, 999);

                    andConditions.push({
                        admissionDateTime: {
                            gte: startDate,
                            lte: endDate,
                        },
                    });
                }
            }

            // Handle other filters
            if (filterType && search) {
                const searchTerm = search as string;
                const searchTerms = searchTerm
                    .trim()
                    .split(/\s+/)
                    .filter((term) => term.length > 0);
                let filterCondition: Prisma.AdmissionWhereInput = {};

                switch (filterType) {
                    case "patientName":
                        if (searchTerms.length > 0) {
                            const termConditions: Prisma.AdmissionWhereInput[] = searchTerms.map((term) => ({
                                patient: {
                                    user: {
                                        OR: [{ fName: { contains: term, mode: "insensitive" } }, { lName: { contains: term, mode: "insensitive" } }],
                                    },
                                },
                            }));
                            filterCondition = { AND: termConditions };
                        }
                        break;

                    case "doctorName":
                        if (searchTerms.length > 0) {
                            const termConditions: Prisma.AdmissionWhereInput[] = searchTerms.map((term) => ({
                                admittingDoctor: {
                                    user: {
                                        OR: [{ fName: { contains: term, mode: "insensitive" } }, { lName: { contains: term, mode: "insensitive" } }],
                                    },
                                },
                            }));
                            filterCondition = { AND: termConditions };
                        }
                        break;

                    case "phoneNumber":
                        filterCondition = {
                            patient: {
                                user: {
                                    phoneNumber: { contains: searchTerm, mode: "insensitive" },
                                },
                            },
                        };
                        break;

                    case "status":
                        const validStatuses: AdmissionStatus[] = ["PLANNED", "ADMITTED", "DISCHARGED", "CANCELLED", "DISCHARGE_STARTED"];
                        const searchForStatus = searchTerm.toLowerCase().trim().replace(/[\s_]/g, "");
                        const matchingStatuses = validStatuses.filter((status) => status.toLowerCase().replace(/_/g, "").includes(searchForStatus));
                        filterCondition = {
                            status: { in: matchingStatuses.length ? matchingStatuses : [] },
                        };
                        break;
                }

                if (Object.keys(filterCondition).length > 0) {
                    andConditions.push(filterCondition);
                }
            }

            const whereCondition: Prisma.AdmissionWhereInput = {
                AND: andConditions.length > 0 ? andConditions : {},
            };

            const [admissions, total] = await Promise.all([
                prisma.admission.findMany({
                    where: whereCondition,
                    skip,
                    take: limitNum,
                    distinct: ["id"],
                    select: {
                        id: true,
                        status: true,
                        staySession: {
                            select: {
                                id: true,
                                currentRoomBooking: {
                                    select: {
                                        room: {
                                            select: {
                                                roomNumber: true,
                                                roomType: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        admissionDateTime: true,
                        expectedDischarge: true,
                        amount: true,
                        paymentType: true,
                        reason: true,
                        patient: {
                            select: {
                                id: true,
                                age: true,
                                gender: true,
                                user: {
                                    select: {
                                        fName: true,
                                        lName: true,
                                        bloodGroup: true,
                                        phoneNumber: true,
                                    },
                                },
                            },
                        },
                        admittingDoctor: {
                            select: {
                                id: true,
                                user: {
                                    select: {
                                        id: true,
                                        email: true,
                                        fName: true,
                                        lName: true,
                                        phoneNumber: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: {
                        admissionDateTime: "desc",
                    },
                }),
                prisma.admission.count({ where: whereCondition }),
            ]);

            return apiSuccess(res, {
                data: admissions,
                message: "Admissions retrieved successfully",
                metadata: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(total / limitNum),
                    totalItems: total,
                    itemsPerPage: limitNum,
                    hasNextPage: pageNum < Math.ceil(total / limitNum),
                    hasPrevPage: pageNum > 1,
                },
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: (error as Error).message,
            });
        }
    },
    async updateAppointmentStatus(req, res) {
        try {
            const body = req.body;

            if (!body.id || !body.status)
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "id and status are required",
                });

            const allowedStatuses = ["CONFIRMED", "CANCELLED"];
            if (!allowedStatuses.includes(body.status.toUpperCase()))
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "Invalid status",
                });

            const DAYMAP: Record<number, "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT"> = {
                0: "SUN",
                1: "MON",
                2: "TUE",
                3: "WED",
                4: "THU",
                5: "FRI",
                6: "SAT",
            };

            const { updatedAppointment, eventData } = await prisma.$transaction(async (tx) => {
                const updatedAppointment = await tx.appointment.update({
                    where: { id: body.id },
                    data: {
                        status: body.status,
                        paidAmount: body.paidAmount,
                    },
                    select: {
                        id: true,
                        patientId: true,
                        appointmentType: true,
                        appointmentDate: true,
                        doctorId: true,
                        doctor: true,
                    },
                });

                const consultationCharge = await getActivePriceAmount(PriceEntityType.DOCTOR_CONSULTATION, updatedAppointment.doctorId, tx);

                if (body.status === "CONFIRMED" && updatedAppointment.appointmentType === "NEW_APPOINTMENT") {
                    // Create or attach to an OPD bill linked to this appointment
                    const billItem = await addItemToBill({
                        patientId: updatedAppointment.patientId as string,
                        entityId: updatedAppointment.doctorId,
                        entityType: BillItemType.CONSULTATION,
                        tx,
                        title: "Consultation Charge",
                        customPrice: Number(consultationCharge),
                        billType: "OPD",
                        appointmentId: body.id,
                    });

                    // Attach any adjustments provided in the request body
                    const allAdjustments: any[] = [];
                    if (body.adjustments && Array.isArray(body.adjustments)) {
                        allAdjustments.push(...body.adjustments);
                    }

                    // If caller provided an event discount payload, include it as an adjustment
                    if (body.eventId && body.eventDiscountValue) {
                        allAdjustments.push({
                            type: "DISCOUNT",
                            mode: body.eventDiscountType === "PERCENT" ? "PERCENTAGE" : "FIXED",
                            value: Number(body.eventDiscountValue),
                            reason: "Event Discount",
                        });
                    }

                    if (allAdjustments.length > 0) {
                        for (const adj of allAdjustments) {
                            await tx.billAdjustment.create({
                                data: {
                                    billId: billItem.billId,
                                    type: adj.type,
                                    mode: adj.mode,
                                    value: adj.value,
                                    reason: adj.reason || `Appointment ${String(adj.type).toLowerCase()}`,
                                },
                            });
                        }
                    }

                    // Record the payment against the bill only if a positive paidAmount is provided
                    if (body.paidAmount && Number(body.paidAmount) > 0) {
                        await tx.payment.create({
                            data: {
                                billId: billItem.billId,
                                amount: Number(body.paidAmount),
                                txId: body.txId,
                                type: "PAYMENT",
                                paymentMethod: body.paymentType,
                            },
                        });

                        // Recalculate bill totals and sync status
                        const fullBill = await tx.bill.findUnique({
                            where: { id: billItem.billId },
                            include: {
                                items: {
                                    where: { status: "ACTIVE" },
                                    include: { billAdjustments: { where: { active: true } } },
                                },
                                adjustments: { where: { active: true } },
                                payments: true,
                            },
                        });

                        if (fullBill) {
                            let totalItemsAmount = 0;
                            fullBill.items.forEach((item: any) => {
                                const itemSubtotal = item.unitPrice * item.quantity;
                                const taxAmount = (itemSubtotal * (item.taxPercent || 0)) / 100;
                                const itemAdjustments = item.billAdjustments.reduce((sum: number, adj: any) => {
                                    const val = adj.mode === "PERCENTAGE" ? (itemSubtotal * adj.value) / 100 : adj.value;
                                    return adj.type === "EXTRA_CHARGE" ? sum + val : sum - val;
                                }, 0);
                                totalItemsAmount += itemSubtotal + taxAmount + itemAdjustments;
                            });

                            const billAdjustmentsTotal = fullBill.adjustments.reduce((sum: number, adj: any) => {
                                const val = adj.mode === "PERCENTAGE" ? (totalItemsAmount * adj.value) / 100 : adj.value;
                                return adj.type === "EXTRA_CHARGE" ? sum + val : sum - val;
                            }, 0);

                            const totalPayable = totalItemsAmount + billAdjustmentsTotal;
                            const totalPaid = fullBill.payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

                            let newStatus = fullBill.status;
                            if (totalPaid >= totalPayable && totalPayable > 0) {
                                newStatus = "PAID";
                            } else if (totalPaid > 0) {
                                newStatus = "PARTIAL";
                            } else if (fullBill.status === "PAID" || fullBill.status === "PARTIAL") {
                                newStatus = "ACTIVE";
                            }

                            if (newStatus !== fullBill.status) {
                                await tx.bill.update({ where: { id: billItem.billId }, data: { status: newStatus } });
                            }
                        }
                    }
                }

                let eventData: {
                    eventApplied: boolean;
                    event?: {
                        id: string;
                        name: string;
                        discountType: string;
                        discountValue: number;
                    };
                    pricing?: {
                        originalAmount: number;
                        discountAmount: number;
                        finalAmount: number;
                    };
                } = { eventApplied: false };

                if (body.status === "CONFIRMED") {
                    const appointmentDate = new Date(updatedAppointment.appointmentDate);
                    const dayOfWeek = DAYMAP[appointmentDate.getDay()];

                    const dayStart = new Date(appointmentDate);
                    dayStart.setHours(0, 0, 0, 0);
                    const dayEnd = new Date(appointmentDate);
                    dayEnd.setHours(23, 59, 59, 999);

                    const activeEvent = await tx.recurringEvent.findFirst({
                        where: {
                            isActive: true,
                            recurrenceDays: { has: dayOfWeek },
                            startDate: { lte: appointmentDate },
                            OR: [{ endDate: null }, { endDate: { gte: dayStart } }],
                        },
                        orderBy: { createdAt: "desc" },
                    });

                    if (activeEvent) {
                        const grossAmount = Number(consultationCharge);

                        const discountAmount =
                            activeEvent.discountType === "PERCENT"
                                ? parseFloat(Math.min(grossAmount, (grossAmount * activeEvent.discountValue) / 100).toFixed(2))
                                : parseFloat(Math.min(grossAmount, activeEvent.discountValue).toFixed(2));

                        const finalAmount = parseFloat((grossAmount - discountAmount).toFixed(2));

                        // End any existing temporary PriceRule for this doctor at the event day start
                        await tx.priceRule.updateMany({
                            where: {
                                entityType: "DOCTOR_CONSULTATION",
                                entityId: updatedAppointment.doctorId,
                                validUntil: { not: null },
                            },
                            data: { validUntil: dayStart },
                        });

                        // Create event-driven PriceRule valid only for this day
                        await tx.priceRule.create({
                            data: {
                                entityType: "DOCTOR_CONSULTATION",
                                entityId: updatedAppointment.doctorId,
                                price: finalAmount,
                                validFrom: dayStart,
                                validUntil: dayEnd,
                            },
                        });

                        // Update appointment paidAmount with the discounted price
                        await tx.appointment.update({
                            where: { id: body.id },
                            data: { paidAmount: Math.round(finalAmount) },
                        });

                        eventData = {
                            eventApplied: true,
                            event: {
                                id: activeEvent.id,
                                name: activeEvent.name,
                                discountType: activeEvent.discountType,
                                discountValue: activeEvent.discountValue,
                            },
                            pricing: {
                                originalAmount: grossAmount,
                                discountAmount,
                                finalAmount,
                            },
                        };
                    }
                }

                return { updatedAppointment, eventData };
            });

            // ─── OPD Notifications (outside transaction — non-critical) ─────────────
            try {
                if (body.status === "CONFIRMED") {
                    const appointmentDetails = await prisma.appointment.findUnique({
                        where: { id: body.id },
                        include: {
                            patient: {
                                include: {
                                    user: {
                                        select: { fName: true, lName: true, phoneNumber: true },
                                    },
                                },
                            },
                            doctor: {
                                include: {
                                    user: {
                                        select: { fName: true, lName: true, phoneNumber: true },
                                    },
                                },
                            },
                            referral: {
                                select: {
                                    referralName: true,
                                    referralContact: true,
                                    referralType: true,
                                },
                            },
                        },
                    });

                    const patientPhone = appointmentDetails?.patient?.phoneNumber ?? appointmentDetails?.patient?.user?.phoneNumber;

                    const patientName = appointmentDetails?.patient?.user ? `${appointmentDetails.patient.user.fName} ${appointmentDetails.patient.user.lName}`.trim() : "Patient";

                    const patientAge = String(appointmentDetails?.patient?.age ?? "N/A");
                    const patientGender = appointmentDetails?.patient?.gender ?? "N/A";

                    const doctorUser = appointmentDetails?.doctor?.user;
                    const doctorPhone = doctorUser?.phoneNumber;
                    const doctorName = doctorUser ? `${doctorUser.fName} ${doctorUser.lName}`.trim() : "Doctor";

                    const appointmentDate = appointmentDetails?.appointmentDate ? formatDate(new Date(appointmentDetails.appointmentDate)) : "N/A";

                    const appointmentTime = appointmentDetails?.startTime ? formatTime(new Date(appointmentDetails.startTime)) : "N/A";

                    const referral = appointmentDetails?.referral;
                    const referralSource = referral?.referralName ?? "Direct";

                    const patientInfoId = appointmentDetails?.patient?.id;
                    const portalLink = patientInfoId ? getPatientPortalLink(patientInfoId) : getAppointmentLink(body.id);

                    // 1. Notify Patient
                    if (patientPhone) {
                        await sendNotification(patientPhone, appointmentConfirmationPatientMessage(patientName, appointmentDate, appointmentTime, doctorName, portalLink));
                    }

                    // 2. Notify Doctor
                    if (doctorPhone) {
                        await sendNotification(doctorPhone, opdDoctorNotificationMessage(doctorName, patientName, patientAge, patientGender, appointmentDate, appointmentTime, referralSource));
                    }

                    // 3. Notify Referrer (only if referral exists and is not NONE)
                    if (referral?.referralContact && referral?.referralType !== "NONE" && referral?.referralType !== null) {
                        await sendNotification(referral.referralContact, opdReferrerNotificationMessage(referral.referralName ?? "Doctor", patientName, appointmentDate, appointmentTime, doctorName));
                    }
                }
            } catch (notifError) {
                console.error("[Notification] OPD notifications failed:", notifError);
            }
            // ─── End OPD Notifications ───────────────────────────────────────────────

            return apiSuccess(res, {
                data: { ...updatedAppointment, ...eventData },
                message: "Appointment status updated successfully",
            });
        } catch (error) {
            console.log(error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to update appointment status",
            });
        }
    },
    async getDoctorAvailableAndUnavailableSlots(req, res) {
        try {
            const { doctorId, selectedDate } = req.query;
            const user = await prisma.employeeInfo.findUnique({
                where: {
                    userId: doctorId ? String(doctorId) : undefined,
                },
            });
            const id = user?.id;
            if (!doctorId || !selectedDate) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "doctorId and selectedDate are required",
                });
            }

            // Parse the selected date
            const date = new Date(String(selectedDate));
            date.setUTCHours(0, 0, 0, 0);
            const nextDay = new Date(date);
            nextDay.setUTCDate(nextDay.getUTCDate() + 1);

            // Get current date at midnight for comparison
            const now = new Date();
            const currentDate = new Date();
            currentDate.setUTCHours(0, 0, 0, 0);

            // Check if selected date is today
            const isToday = date.getTime() === currentDate.getTime();

            // Get all leaves with exception dates
            const leaves = await prisma.unavailability.findMany({
                where: {
                    userId: String(doctorId),
                    exceptionDates: {
                        isEmpty: false,
                    },
                },
                select: {
                    id: true,
                    exceptionDates: true,
                    isAllDay: true,
                    startTime: true,
                    endTime: true,
                },
            });

            // Filter leaves for response - only show today and future exception dates
            const filteredLeaves = leaves
                .map((i) => ({
                    ...i,
                    exceptionDates: i.exceptionDates.filter((exceptionDate) => {
                        // Create date object and set to midnight
                        const excDate = new Date(exceptionDate);
                        excDate.setUTCHours(0, 0, 0, 0);
                        // Include today and future dates
                        return excDate >= currentDate;
                    }),
                }))
                .filter((i) => i.exceptionDates.length > 0);

            // Check if selected date is in any exception dates
            const isExceptionDate = filteredLeaves.some((leave) =>
                leave.exceptionDates.some((exceptionDateStr) => {
                    const excDate = new Date(exceptionDateStr);
                    excDate.setUTCHours(0, 0, 0, 0);
                    return excDate.getTime() === date.getTime();
                }),
            );

            // Step 1: Check for all-day unavailability
            const allDayUnavailability = await prisma.unavailability.findFirst({
                where: {
                    userId: String(doctorId),
                    isAllDay: true,
                    startTime: {
                        gte: date,
                        lt: nextDay,
                    },
                },
            });

            // Get time slots from database
            const dbTimeSlots = await prisma.timeSlot.findMany({
                orderBy: { startTime: "asc" },
            });

            // Convert database time slots to selected date using local time
            const allTimeSlots = dbTimeSlots.map((dbSlot) => {
                // Get time from database slot (using local time)
                const dbStartTime = new Date(dbSlot.startTime);
                const dbEndTime = new Date(dbSlot.endTime);

                // Extract UTC hours and minutes
                const startHours = dbStartTime.getUTCHours();
                const startMinutes = dbStartTime.getUTCMinutes();
                const endHours = dbEndTime.getUTCHours();
                const endMinutes = dbEndTime.getUTCMinutes();

                // Create slot for selected date with extracted time (local time)
                const slotStartTime = new Date(date);
                slotStartTime.setUTCHours(startHours, startMinutes, 0, 0);

                const slotEndTime = new Date(date);
                slotEndTime.setUTCHours(endHours, endMinutes, 0, 0);

                return {
                    id: dbSlot.id,
                    startTime: slotStartTime,
                    endTime: slotEndTime,
                };
            });

            // If doctor is unavailable all day OR it's an exception date, return all slots as unavailable
            if (allDayUnavailability || isExceptionDate) {
                const slots = allTimeSlots.map((slot) => {
                    // For today's exception date, also check if time has passed
                    let status = "UNAVAILABLE";
                    let isAvailable = false;

                    if (isToday) {
                        // If it's today and the slot has already ended, mark as unavailable
                        if (slot.endTime <= now) {
                            status = "UNAVAILABLE";
                            isAvailable = false;
                        }
                    }

                    return {
                        id: slot.id,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        status,
                        isAvailable,
                    };
                });

                const groupedSlots = {
                    available: [],
                    booked: [],
                    unavailable: slots,
                };

                return apiSuccess(res, {
                    data: {
                        slots: slots,
                        leaves: filteredLeaves,
                        summary: {
                            total: slots.length,
                            available: 0,
                            booked: 0,
                            unavailable: slots.length,
                        },
                    },
                    message: allDayUnavailability ? "Doctor is unavailable all day" : "Doctor is on leave",
                });
            }

            // Step 2: Get doctor's CONFIRMED appointments for the selected date
            const appointments = await prisma.appointment.findMany({
                where: {
                    doctorId: String(user?.id),
                    startTime: {
                        gte: date,
                        lt: nextDay,
                    },
                    status: { in: ["CONFIRMED", "IN_PROGRESS"] },
                },
                select: {
                    startTime: true,
                    endTime: true,
                },
            });

            // Step 3: Get doctor's time-specific unavailability for the selected date
            const unavailabilities = await prisma.unavailability.findMany({
                where: {
                    userId: String(doctorId),
                    isAllDay: false,
                    OR: [
                        {
                            startTime: {
                                gte: date,
                                lt: nextDay,
                            },
                        },
                        {
                            startTime: { lt: date },
                            endTime: { gt: date },
                        },
                    ],
                },
                select: {
                    startTime: true,
                    endTime: true,
                },
            });

            // Step 4: Create availability slots
            const availabilitySlots = allTimeSlots.map((slot) => {
                const { startTime, endTime, id } = slot;

                // Check if slot is booked (CONFIRMED appointment)
                const isBooked = appointments.some((app) => app.startTime && app?.startTime < endTime && app.endTime && app.endTime > startTime);

                // Check if slot is in unavailability
                const isUnavailable = unavailabilities.some((unav) => {
                    const unavStart = unav.startTime;
                    const unavEnd = unav.endTime || new Date(unavStart.getTime() + 24 * 60 * 60 * 1000);
                    return startTime < unavEnd && endTime > unavStart;
                });

                let status = "AVAILABLE";

                // If it's today, check if slot time has already passed
                if (isToday && endTime <= now) {
                    status = "UNAVAILABLE";
                } else if (isBooked) {
                    status = "BLOCKED";
                } else if (isUnavailable) {
                    status = "UNAVAILABLE";
                }

                return {
                    id: id,
                    startTime: startTime,
                    endTime: endTime,
                    status,
                    isAvailable: status === "AVAILABLE",
                };
            });

            // Step 5: Group slots
            const groupedSlots = {
                available: availabilitySlots.filter((slot) => slot.status === "AVAILABLE"),
                booked: availabilitySlots.filter((slot) => slot.status === "BLOCKED"),
                unavailable: availabilitySlots.filter((slot) => slot.status === "UNAVAILABLE"),
            };

            return apiSuccess(res, {
                data: {
                    slots: availabilitySlots,
                    leaves: filteredLeaves,
                    summary: {
                        total: availabilitySlots.length,
                        available: groupedSlots.available.length,
                        booked: groupedSlots.booked.length,
                        unavailable: groupedSlots.unavailable.length,
                    },
                },
                message: "Doctor availability slots fetched successfully",
            });
        } catch (error) {
            console.error("Error fetching doctor availability slots:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch doctor availability slots",
            });
        }
    },
    async getDoctorAvailableDates(req, res) {
        try {
            const { doctorId } = req.query;

            if (!doctorId) {
                return res.status(400).json({ message: "doctorId is required" });
            }

            // Get today's date in UTC (YYYY-MM-DD)
            const today = new Date();
            const todayYear = today.getUTCFullYear();
            const todayMonth = String(today.getUTCMonth() + 1).padStart(2, "0");
            const todayDay = String(today.getUTCDate()).padStart(2, "0");
            const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;

            // Create start and end dates for the query (using UTC)
            const startDate = new Date(todayStr + "T00:00:00.000Z");
            const endDate = new Date(startDate);
            endDate.setUTCDate(endDate.getUTCDate() + 30);

            // Step 1: Get all-day unavailabilities for the next 30 days
            const allDayUnavailabilities = await prisma.unavailability.findMany({
                where: {
                    userId: String(doctorId),
                    isAllDay: true,
                    startTime: {
                        gte: startDate,
                        lt: endDate,
                    },
                },
                select: {
                    startTime: true,
                },
            });

            // Create a Set of dates with all-day unavailability
            const allDayUnavailableDates = new Set();
            allDayUnavailabilities.forEach((unavailability) => {
                const date = new Date(unavailability.startTime);
                const year = date.getUTCFullYear();
                const month = String(date.getUTCMonth() + 1).padStart(2, "0");
                const day = String(date.getUTCDate()).padStart(2, "0");
                allDayUnavailableDates.add(`${year}-${month}-${day}`);
            });

            const availableDates = [];

            // Generate next 30 days from today
            for (let i = 0; i < 30; i++) {
                const currentDate = new Date(startDate);
                currentDate.setUTCDate(startDate.getUTCDate() + i);

                const year = currentDate.getUTCFullYear();
                const month = String(currentDate.getUTCMonth() + 1).padStart(2, "0");
                const day = String(currentDate.getUTCDate()).padStart(2, "0");
                const dateStr = `${year}-${month}-${day}`;

                // Skip if doctor has all-day unavailability
                if (!allDayUnavailableDates.has(dateStr)) {
                    availableDates.push({ date: dateStr });
                }
            }

            return apiSuccess(res, {
                data: availableDates,
                message: "Doctor available dates fetched successfully",
            });
        } catch (error) {
            console.error("Error fetching doctor available dates:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch doctor available dates",
            });
        }
    },
    async blockUnblockDoctorTimeSlot(req, res) {
        const { block, doctorId, startTime, endTime, isAllDay, isRecurring, exceptionDates, timeZone } = req.body;
        try {
            // Validate required inputs
            if (!doctorId || !startTime) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "doctorId and startTime are required",
                });
            }
            // Prepare data for creation
            const data: any = {
                userId: String(doctorId),
                startTime: new Date(startTime),
                isAllDay: isAllDay || false,
                isRecurring: isRecurring || false,
                timeZone: timeZone || "UTC",
            };

            // Add endTime if provided (optional for all-day events)
            if (endTime) {
                data.endTime = new Date(endTime);
            } else if (!isAllDay) {
                // If not all-day and no endTime provided, set default duration (e.g., 30 minutes)
                const start = new Date(startTime);
                start.setUTCMinutes(start.getUTCMinutes() + 30);
                data.endTime = start;
            }
            // Add exception dates if provided
            if (exceptionDates && Array.isArray(exceptionDates)) {
                data.exceptionDates = exceptionDates.map((date) => new Date(date));
            }

            // Create the unavailability record
            let unavailability;
            if (block) {
                unavailability = await prisma.unavailability.create({
                    data: data,
                });
            } else {
                const unae = await prisma.unavailability.findFirst({
                    where: {
                        userId: data.doctorId,
                        startTime: data.startTime,
                    },
                });
                if (unae) {
                    await prisma.unavailability.delete({
                        where: {
                            id: unae.id,
                        },
                    });
                }
            }

            return apiSuccess(res, {
                data: unavailability,
                message: "Doctor time slot blocked successfully",
            });
        } catch (error) {
            console.error("Error blocking doctor time slot:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to block doctor time slot",
            });
        }
    },
    async getAppointmentById(req, res) {
        try {
            const appointment = await prisma.appointment.findUnique({
                where: {
                    id: req.params.id as string,
                },
                select: {
                    id: true,
                    appointmentDate: true,
                    startTime: true,
                    endTime: true,
                    status: true,
                    reason: true,
                    appointmentType: true,

                    // admissionType: true,
                    // patientType: true,
                    patient: {
                        select: {
                            id: true,
                            age: true,
                            gender: true,
                            emergencyContactName: true,
                            emergencyContact: true,
                            emergencyContactNotes: true,
                            insuranceProvider: true,
                            policyNumber: true,
                            policyHolderName: true,
                            policyExpiryDate: true,
                            tpaName: true,
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    fName: true,
                                    lName: true,
                                    phoneNumber: true,
                                    bloodGroup: true,
                                },
                            },
                        },
                    },
                    doctor: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    fName: true,
                                    lName: true,
                                    phoneNumber: true,
                                    employeeInfo: {
                                        select: {
                                            id: true,
                                            department: {
                                                select: {
                                                    id: true,
                                                    name: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    referral: {
                        select: {
                            id: true,
                            referralName: true,
                            referralContact: true,
                            referralType: true,
                            concessionPercentage: true,
                            appointmentId: true,
                            referralUser: {
                                select: {
                                    id: true,
                                    referralName: true,
                                    referralContact: true,
                                    referralType: true,
                                    concessionPercentage: true,
                                    referralEmployee: {
                                        select: {
                                            user: {
                                                select: {
                                                    fName: true,
                                                    lName: true,
                                                    phoneNumber: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    visits: {
                        include: {
                            prescriptions: {
                                include: {
                                    prescriptionItems: {
                                        include: {
                                            item: true,
                                        },
                                    },
                                },
                            },
                            patientVitals: {
                                include: {
                                    vitals: true,
                                },
                            },
                        },
                    },
                },
            });

            return apiSuccess(res, {
                data: appointment,
                message: "Appointment retrieved successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to retrieve appointment",
            });
        }
    },
    async getAdmissionById(req, res) {
        try {
            const id = req.params.id as string;
            const admission = await prisma.admission.findUnique({
                where: { id },
                select: {
                    id: true,
                    status: true,
                    staySession: {
                        select: {
                            id: true,
                            currentRoomBooking: {
                                select: {
                                    room: {
                                        select: {
                                            id: true,
                                            roomNumber: true,
                                            roomType: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    admissionDateTime: true,
                    expectedDischarge: true,
                    reason: true,
                    sourceType: true,
                    patient: {
                        select: {
                            age: true,
                            gender: true,
                            insuranceProvider: true,

                            policyNumber: true,
                            policyHolderName: true,
                            policyExpiryDate: true,
                            tpaName: true,
                            emergencyContactName: true,
                            emergencyContact: true,
                            emergencyContactNotes: true,
                            user: {
                                select: {
                                    email: true,
                                    fName: true,
                                    lName: true,
                                    bloodGroup: true,
                                    phoneNumber: true,
                                },
                            },
                        },
                    },
                    admittingDoctor: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    fName: true,
                                    lName: true,
                                    phoneNumber: true,
                                    employeeInfo: {
                                        select: {
                                            department: {
                                                select: {
                                                    name: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    reference: {
                        select: {
                            id: true,
                            reason: true,
                            referralName: true,
                            referralContact: true,
                            referralType: true,
                            referralDate: true,
                            concessionPercentage: true,
                            referralUser: {
                                select: {
                                    id: true,
                                    referralName: true,
                                    referralContact: true,
                                    referralType: true,
                                    concessionPercentage: true,
                                    referralEmployee: {
                                        select: {
                                            user: {
                                                select: {
                                                    fName: true,
                                                    lName: true,
                                                    phoneNumber: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });
            return apiSuccess(res, {
                data: admission,
                message: "Admission retrieved successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to retrieve admission",
            });
        }
    },
    async getOutpatientById(req, res) {
        try {
            const appointment = await prisma.appointment.findUnique({
                where: {
                    id: req.params.id as string,
                },
                select: {
                    id: true,
                    appointmentDate: true,
                    startTime: true,
                    endTime: true,
                    status: true,
                    reason: true,
                    appointmentType: true,

                    // admissionType: true,
                    // patientType: true,
                    patient: {
                        select: {
                            id: true,
                            age: true,
                            gender: true,
                            emergencyContactName: true,
                            emergencyContact: true,
                            emergencyContactNotes: true,
                            insuranceProvider: true,
                            policyNumber: true,
                            policyHolderName: true,
                            policyExpiryDate: true,
                            tpaName: true,
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    fName: true,
                                    lName: true,
                                    phoneNumber: true,
                                    bloodGroup: true,
                                },
                            },
                        },
                    },
                    doctor: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    fName: true,
                                    lName: true,
                                    phoneNumber: true,
                                    employeeInfo: {
                                        select: {
                                            id: true,
                                            department: {
                                                select: {
                                                    id: true,
                                                    name: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    referral: {
                        where: {
                            appointmentId: null,
                        },
                        select: {
                            id: true,
                            referralName: true,
                            referralContact: true,
                            referralType: true,
                            concessionPercentage: true,
                            appointmentId: true,
                            referralUser: {
                                select: {
                                    id: true,
                                    referralName: true,
                                    referralContact: true,
                                    referralType: true,
                                    concessionPercentage: true,
                                    referralEmployee: {
                                        select: {
                                            user: {
                                                select: {
                                                    fName: true,
                                                    lName: true,
                                                    phoneNumber: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    visits: {
                        include: {
                            prescriptions: {
                                include: {
                                    prescriptionItems: {
                                        include: {
                                            item: true,
                                        },
                                    },
                                },
                            },
                            patientVitals: {
                                include: {
                                    vitals: true,
                                },
                            },
                        },
                    },
                },
            });

            return apiSuccess(res, {
                data: appointment,
                message: "Appointment retrieved successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to retrieve appointment",
            });
        }
    },
    async updateAppointment(req, res) {
        try {
            const id = req.params.id as string;
            const body = req.body;

            if (!id) {
                return res.status(400).json({ message: "Appointment ID is required" });
            }

            // Check if appointment exists
            const existingAppointment = await prisma.appointment.findUnique({
                where: { id },
                include: {
                    patient: {
                        include: { user: true },
                    },
                    doctor: true,
                    referral: true,
                },
            });

            if (!existingAppointment) {
                return res.status(404).json({ message: "Appointment not found" });
            }

            const updatedAppointment = await prisma.$transaction(async (tx) => {
                if (body.patientInfo && existingAppointment.patient) {
                    await tx.user.update({
                        where: { id: existingAppointment.patient.user.id },
                        data: {
                            email: body.patientInfo.email || existingAppointment.patient.user.email,
                            fName: body.patientInfo.fName || existingAppointment.patient.user.fName,
                            lName: body.patientInfo.lName || existingAppointment.patient.user.lName,
                            phoneNumber: body.patientInfo.phoneNumber || existingAppointment.patient.user.phoneNumber,
                            bloodGroup: (body.patientInfo.bloodGroup as BloodGroupType) || existingAppointment.patient.user.bloodGroup,
                        },
                    });

                    // Update patient info
                    const patientUpdateData: any = {
                        gender: body.patientInfo.gender || existingAppointment.patient.gender,
                        age: body.patientInfo.age || existingAppointment.patient.age,
                    };

                    // Add insurance info if patient is inpatient

                    if (body.insuranceInfo) {
                        patientUpdateData.insuranceProvider = body.insuranceInfo.insuranceProvider;
                        patientUpdateData.policyNumber = body.insuranceInfo.policyNumber;
                        patientUpdateData.policyHolderName = body.insuranceInfo.policyHolderName;
                        patientUpdateData.policyExpiryDate = body.insuranceInfo.policyExpiryDate ? new Date(body.insuranceInfo.policyExpiryDate) : null;
                        patientUpdateData.tpaName = body.insuranceInfo.tpaName;
                    }
                    // patientUpdateData.emergencyContactName = body.emergencyContactName;
                    // patientUpdateData.emergencyContact = body.emergencyContact;
                    // patientUpdateData.emergencyContactNotes = body.emergencyContactNotes;

                    await tx.patientInfo.update({
                        where: { id: existingAppointment.patient.id },
                        data: patientUpdateData,
                    });
                }

                // Check for time slot conflicts if doctor or time is being updated
                if ((body.doctorId || body.startTime) && body.status !== "CANCELLED" && body.status !== "CONFIRMED") {
                    const doctorId = body.doctorId || existingAppointment.doctorId;
                    const startTimeToCheck = body.startTime || existingAppointment.startTime;
                    const endTimeToCheck = body.endTime || existingAppointment.endTime;

                    const conflictingAppointment = await tx.appointment.findFirst({
                        where: {
                            doctorId: doctorId as string,
                            id: { not: id },
                            startTime: startTimeToCheck,
                            status: {
                                notIn: ["CANCELLED"],
                            },
                        },
                    });

                    // if (conflictingAppointment) {
                    //     throw new Error("This time slot is already booked. Please choose another time.");
                    // }
                }

                // Prepare appointment update data
                // Prepare appointment update data
                const appointmentUpdateData: any = {
                    appointmentDate: body.appointmentDate || existingAppointment.appointmentDate,
                    startTime: body.startTime || existingAppointment.startTime,
                    endTime: body.endTime || existingAppointment.endTime,
                    status: body.status || existingAppointment.status,
                    reason: body.reason ?? existingAppointment.reason,
                    appointmentType: body.appointmentType || existingAppointment.appointmentType,
                };

                // Handle doctor change
                if (body.doctorId && body.doctorId !== existingAppointment.doctorId) {
                    // Check if new doctor exists
                    const newDoctor = await tx.employeeInfo.findUnique({
                        where: { id: body.doctorId },
                    });

                    if (!newDoctor) {
                        throw new Error("Selected doctor does not exist.");
                    }
                    appointmentUpdateData.doctorId = body.doctorId;
                }

                // Room booking logic removed from appointment update as per new schema
                /*if (body.roomId !== undefined) {
                            // Logic disabled
                        }*/

                // Update appointment
                const updatedAppointment = await tx.appointment.update({
                    where: { id },
                    data: appointmentUpdateData,
                    include: {
                        patient: {
                            include: {
                                user: true,
                            },
                        },
                        doctor: {
                            include: {
                                user: true,
                            },
                        },
                        referral: true,
                    },
                });

                // OPD Billing Integration
                if (body.status === "CONFIRMED" && existingAppointment.status !== "CONFIRMED" && existingAppointment.appointmentType !== "FOLLOW_UP") {
                    const billItem = await addItemToBill({
                        patientId: existingAppointment.patientId as string,
                        entityId: existingAppointment.doctorId,
                        entityType: BillItemType.CONSULTATION,
                        quantity: 1,
                        tx,
                        customPrice: body.amount,
                        billType: "OPD",
                        appointmentId: id,
                        title: `Consultation with Dr. ${updatedAppointment.doctor.user.fName} ${updatedAppointment.doctor.user.lName}`,
                    });

                    // Collect all adjustments including manual ones and event discounts
                    const allAdjustments: any[] = [];

                    if (body.adjustments && Array.isArray(body.adjustments)) {
                        allAdjustments.push(...body.adjustments);
                    }

                    if (body.eventId && body.eventDiscountValue) {
                        allAdjustments.push({
                            type: "DISCOUNT",
                            mode: body.eventDiscountType === "PERCENT" ? "PERCENTAGE" : "FIXED",
                            value: Number(body.eventDiscountValue),
                            reason: "Event Discount",
                        });
                    }

                    if (allAdjustments.length > 0) {
                        for (const adj of allAdjustments) {
                            await tx.billAdjustment.create({
                                data: {
                                    billId: billItem.billId,
                                    type: adj.type,
                                    mode: adj.mode,
                                    value: adj.value,
                                    reason: adj.reason || `Appointment ${adj.type.toLowerCase()}`,
                                },
                            });
                        }
                    }

                    // Process payment if paidAmount > 0
                    if (body.paidAmount && body.paidAmount > 0) {
                        await tx.payment.create({
                            data: {
                                billId: billItem.billId,
                                amount: body.paidAmount,
                                type: "PAYMENT",
                                paymentMethod: body.paymentType || "CASH",
                                txId: body.txId || null,
                                notes: "Appointment confirmation payment",
                            },
                        });

                        // If fully paid
                        if (body.paidAmount >= body.amount) {
                            await tx.bill.update({
                                where: { id: billItem.billId },
                                data: { status: "PAID", finalizedAt: new Date() },
                            });
                        }
                    }
                }

                // Handle referral update
                if (body.referralInfo !== undefined) {
                    if (body.referralInfo) {
                        // Update or create referral
                        const existingReferral = await tx.reference.findUnique({
                            where: { appointmentId: id },
                        });

                        if (existingReferral) {
                            await tx.reference.update({
                                where: { appointmentId: id },
                                data: {
                                    referralName: body.referralInfo.referralName,
                                    referralContact: body.referralInfo.referralContact,
                                    referralType: body.referralInfo.referralType,
                                    concessionPercentage: body.referralInfo.concessionPercentage,
                                    referralEmployeeId: body.referralInfo.referralEmployeeId,
                                    referralId: body.referralInfo.referralId,
                                },
                            });
                        } else {
                            await tx.reference.create({
                                data: {
                                    patientId: existingAppointment.patientId as string,
                                    referralName: body.referralInfo.referralName,
                                    referralContact: body.referralInfo.referralContact,
                                    referralType: body.referralInfo.referralType,
                                    concessionPercentage: body.referralInfo.concessionPercentage,
                                    appointmentId: id,
                                    referralEmployeeId: body.referralInfo.referralEmployeeId,
                                    referralId: body.referralInfo.referralId,
                                },
                            });
                        }
                    } else {
                        // Remove referral if referralType is NONE or referralInfo is null
                        await tx.reference.deleteMany({
                            where: { appointmentId: id },
                        });
                    }
                }

                return updatedAppointment;
            });

            return apiSuccess(res, {
                data: updatedAppointment,
                message: "Appointment updated successfully",
            });
        } catch (error) {
            console.error("Error updating appointment:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to update appointment",
            });
        }
    },
    async updateAdmission(req, res) {
        try {
            const id = req.params.id as string;
            const body = req.body;

            if (!id) {
                return res.status(400).json({ message: "Admission ID is required" });
            }

            const existingAdmission = await prisma.admission.findUnique({
                where: { id },
                include: {
                    patient: {
                        include: { user: true },
                    },
                    staySession: {
                        include: {
                            currentRoomBooking: true,
                        },
                    },
                },
            });

            if (!existingAdmission) {
                return res.status(404).json({ message: "Admission not found" });
            }

            const updatedAdmission = await prisma.$transaction(async (tx) => {
                if (body.patientInfo && existingAdmission.patient) {
                    await tx.user.update({
                        where: { id: existingAdmission.patient.user.id },
                        data: {
                            email: body.patientInfo.email || existingAdmission.patient.user.email,
                            fName: body.patientInfo.fName || existingAdmission.patient.user.fName,
                            lName: body.patientInfo.lName || existingAdmission.patient.user.lName,
                            phoneNumber: body.patientInfo.phoneNumber || existingAdmission.patient.user.phoneNumber,
                            bloodGroup: (body.patientInfo.bloodGroup as BloodGroupType) || existingAdmission.patient.user.bloodGroup,
                        },
                    });

                    const patientUpdateData: any = {
                        gender: body.patientInfo.gender || existingAdmission.patient.gender,
                        age: body.patientInfo.age || existingAdmission.patient.age,
                    };

                    if (body.insuranceInfo) {
                        patientUpdateData.insuranceProvider = body.insuranceInfo.insuranceProvider;
                        patientUpdateData.policyNumber = body.insuranceInfo.policyNumber;
                        patientUpdateData.policyHolderName = body.insuranceInfo.policyHolderName;
                        patientUpdateData.policyExpiryDate = body.insuranceInfo.policyExpiryDate ? new Date(body.insuranceInfo.policyExpiryDate) : null;
                        patientUpdateData.tpaName = body.insuranceInfo.tpaName;
                    }

                    if (body.emergencyContact) {
                        patientUpdateData.emergencyContactName = body.emergencyContact.name;
                        patientUpdateData.emergencyContact = body.emergencyContact.contact;
                        patientUpdateData.emergencyContactNotes = body.emergencyContact.notes;
                    }

                    await tx.patientInfo.update({
                        where: { id: existingAdmission.patient.id },
                        data: patientUpdateData,
                    });
                }

                const admissionUpdateData: any = {
                    reason: body.reason ?? existingAdmission.reason,
                    sourceType: body.sourceType || existingAdmission.sourceType,
                    admissionDateTime: body.admissionDateTime ? new Date(body.admissionDateTime) : existingAdmission.admissionDateTime,
                    expectedDischarge: body.expectedDischarge ? new Date(body.expectedDischarge) : existingAdmission.expectedDischarge,
                    status: (body.status as AdmissionStatus) || existingAdmission.status,
                    paymentType: body.paymentType || existingAdmission.paymentType,
                    ...(body.paymentType === "UPI" || body.paymentType === "CARD" ? { amount: body.amount, txnId: body.txnId } : {}),
                };

                const isCancelling = body.status === "CANCELLED" && existingAdmission.status !== "CANCELLED";

                if (body.roomId && !isCancelling) {
                    const doctor = await tx.employeeInfo.findUnique({
                        where: { id: existingAdmission.admittingDoctorId },
                        select: { userId: true },
                    });
                    if (!doctor) {
                        throw new Error("Admitting doctor not found");
                    }

                    const freshRoom = await tx.room.findUnique({
                        where: { id: body.roomId },
                    });
                    if (!freshRoom) {
                        throw new Error("Room not found");
                    }
                    if (freshRoom.status !== RoomStatus.AVAILABLE) {
                        throw new Error("Room is not available");
                    }

                    const bookingStart = body.admissionDateTime ? new Date(body.admissionDateTime) : existingAdmission.admissionDateTime;

                    // Create new room booking
                    const roomBooking = await tx.roomBooking.create({
                        data: {
                            roomId: body.roomId,
                            patientId: existingAdmission.patientId,
                            doctorId: doctor.userId,
                            startTime: bookingStart,
                            status: "CONFIRMED",
                            title: `Admission for ${existingAdmission.patient.user.fName} ${existingAdmission.patient.user.lName}`,
                            description: "Inpatient Admission",
                            roomCharges: body.roomCharges || 0,
                        },
                    });

                    // Create new inpatient stay session
                    const newStaySession = await tx.inpatientStaySession.create({
                        data: {
                            admissionId: existingAdmission.id,
                            patientId: existingAdmission.patientId,
                            currentRoomBookingId: roomBooking.id,
                            startedAt: bookingStart,
                            status: "ACTIVE",
                        },
                    });

                    // Update room occupancy and status
                    const newOccupancy = freshRoom.currentOccupancy + 1;
                    const newStatus = freshRoom.capacity === newOccupancy ? RoomStatus.OCCUPIED : RoomStatus.AVAILABLE;
                    await tx.room.update({
                        where: { id: body.roomId },
                        data: {
                            status: newStatus,
                            currentOccupancy: newOccupancy,
                        },
                    });

                    // Add room charge to bill
                    try {
                        await addItemToBill({
                            patientId: existingAdmission.patientId,
                            entityId: freshRoom.roomTypeId,
                            entityType: BillItemType.ROOM,
                            tx,
                            title: `Room Charges: ${freshRoom.roomNumber}`,
                            billType: "IPD",
                            admissionId: existingAdmission.id,
                        });
                    } catch (billingError) {
                        console.warn("[updateAdmission] Skipped billing item creation:", billingError instanceof Error ? billingError.message : billingError);
                    }

                    // Optionally, you may want to update the admission's `expectedDischarge` based on the new room? Not required.
                }
                if (isCancelling) {
                    if (existingAdmission.staySession) {
                        await tx.inpatientStaySession.update({
                            where: { id: existingAdmission.staySession.id },
                            data: {
                                status: "CANCELLED",
                                endedAt: new Date(),
                            },
                        });
                    }

                    if (existingAdmission.staySession?.currentRoomBookingId) {
                        const roomBooking = await tx.roomBooking.findUnique({
                            where: { id: existingAdmission.staySession.currentRoomBookingId },
                            include: { room: true },
                        });

                        if (roomBooking) {
                            // Update room booking status to CANCELLED
                            await tx.roomBooking.update({
                                where: { id: roomBooking.id },
                                data: {
                                    status: "CANCELLED",
                                    cancellationReason: "Admission cancelled",
                                    endTime: new Date(),
                                },
                            });

                            if (roomBooking.roomId) {
                                await tx.room.update({
                                    where: { id: roomBooking.roomId },
                                    data: {
                                        isAvailable: true,
                                        status: "AVAILABLE",
                                        currentOccupancy: {
                                            decrement: 1,
                                        },
                                    },
                                });
                            }
                        }
                    }
                }
                const updated = await tx.admission.update({
                    where: { id },
                    data: admissionUpdateData,
                    include: {
                        patient: {
                            include: { user: true },
                        },
                        admittingDoctor: {
                            include: { user: true },
                        },
                    },
                });

                if (body.referralInfo) {
                    //Action required
                    if (existingAdmission.sourceAppointmentId) {
                        await tx.reference.upsert({
                            where: { appointmentId: existingAdmission.sourceAppointmentId },
                            update: {
                                referralName: body.referralInfo.referralName,
                                referralContact: body.referralInfo.referralContact,
                                referralType: body.referralInfo.referralType,
                                concessionPercentage: body.referralInfo.concessionPercentage,
                                referralEmployeeId: body.referralInfo.referralEmployeeId,
                                referralId: body.referralInfo.referralId,
                            },
                            create: {
                                patientId: existingAdmission.patientId,
                                referralName: body.referralInfo.referralName,
                                referralContact: body.referralInfo.referralContact,
                                referralType: body.referralInfo.referralType,
                                concessionPercentage: body.referralInfo.concessionPercentage,
                                referralEmployeeId: body.referralInfo.referralEmployeeId,
                                appointmentId: existingAdmission.sourceAppointmentId,
                                referralId: body.referralInfo.referralId,
                            },
                        });
                    }
                    //
                    if (existingAdmission.id) {
                        await tx.reference.upsert({
                            where: { admissionId: existingAdmission.id },
                            update: {
                                referralName: body.referralInfo.referralName,
                                referralContact: body.referralInfo.referralContact,
                                referralType: body.referralInfo.referralType,
                                concessionPercentage: body.referralInfo.concessionPercentage,
                                referralEmployeeId: body.referralInfo.referralEmployeeId,
                                referralId: body.referralInfo.referralId,
                            },
                            create: {
                                patientId: existingAdmission.patientId,
                                referralName: body.referralInfo.referralName,
                                referralContact: body.referralInfo.referralContact,
                                referralType: body.referralInfo.referralType,
                                concessionPercentage: body.referralInfo.concessionPercentage,
                                referralEmployeeId: body.referralInfo.referralEmployeeId,
                                admissionId: existingAdmission.id,
                                referralId: body.referralInfo.referralId,
                            },
                        });
                    }
                }

                return updated;
            });

            return apiSuccess(res, {
                data: updatedAdmission,
                message: existingAdmission.status !== "CANCELLED" && body.status === "CANCELLED" ? "Admission cancelled successfully" : "Admission updated successfully",
            });
        } catch (error) {
            console.error("Error updating admission:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to update admission",
            });
        }
    },
    async getAllReferrals(req, res) {
        try {
            const query: {
                page?: string;
                limit?: string;
                searchQuery?: string | AppointmentStatus | AdmissionStatus;
            } = req.query;

            const page = Math.max(1, parseInt(String(query.page)) || 1);
            const limit = Math.max(1, parseInt(String(query.limit)) || 100);
            const skip = (page - 1) * limit;
            const searchQuery = query.searchQuery?.trim();
            const appointmentStatus = searchQuery ? (AppointmentStatus[searchQuery.toUpperCase() as keyof typeof AppointmentStatus] as AppointmentStatus) : undefined;
            const admissionStatus = searchQuery ? (AdmissionStatus[searchQuery.toUpperCase() as keyof typeof AdmissionStatus] as AdmissionStatus) : undefined;

            const filters: Prisma.ReferenceWhereInput[] = [];
            if (searchQuery) {
                const orConditions: Prisma.ReferenceWhereInput[] = [
                    {
                        patient: {
                            user: { fName: { contains: searchQuery, mode: "insensitive" } },
                        },
                    },
                    {
                        patient: {
                            user: { lName: { contains: searchQuery, mode: "insensitive" } },
                        },
                    },
                    { referralName: { contains: searchQuery, mode: "insensitive" } },
                    {
                        referralEmployee: {
                            user: { fName: { contains: searchQuery, mode: "insensitive" } },
                        },
                    },
                    {
                        referralEmployee: {
                            user: { lName: { contains: searchQuery, mode: "insensitive" } },
                        },
                    },
                ];

                if (appointmentStatus) {
                    orConditions.push({
                        appointment: {
                            status: appointmentStatus,
                        },
                    });
                }
                if (admissionStatus) {
                    orConditions.push({
                        admission: {
                            status: admissionStatus,
                        },
                    });
                }

                filters.push({ OR: orConditions });
            }

            const where: Prisma.ReferenceWhereInput = {
                AND: [
                    ...filters,
                    {
                        OR: [{ appointment: { status: { not: AppointmentStatus.CANCELLED } } }, { appointmentId: null }],
                    },
                    {
                        OR: [{ admission: { status: { not: AdmissionStatus.CANCELLED } } }, { admissionId: null }],
                    },
                ],
            };

            const [total, referrals] = await Promise.all([
                prisma.reference.count({
                    where: where,
                }),
                prisma.reference.findMany({
                    where: where,
                    select: {
                        referralName: true,
                        patient: {
                            select: {
                                id: true,
                                age: true,
                                gender: true,
                                user: {
                                    select: {
                                        id: true,
                                        fName: true,
                                        lName: true,
                                    },
                                },
                            },
                        },
                        appointment: {
                            select: {
                                id: true,
                                appointmentDate: true,
                                status: true,
                                doctor: {
                                    select: {
                                        id: true,
                                        user: {
                                            select: {
                                                id: true,
                                                fName: true,
                                                lName: true,
                                                employeeInfo: {
                                                    select: {
                                                        id: true,
                                                        department: {
                                                            select: {
                                                                id: true,
                                                                name: true,
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        admission: {
                            select: {
                                id: true,
                                admissionDateTime: true,
                                status: true,
                                admittingDoctor: {
                                    select: {
                                        id: true,
                                        user: {
                                            select: {
                                                id: true,
                                                fName: true,
                                                lName: true,
                                                employeeInfo: {
                                                    select: {
                                                        id: true,
                                                        department: {
                                                            select: {
                                                                id: true,
                                                                name: true,
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    skip,
                    take: limit,
                }),
            ]);
            return apiSuccess(res, {
                data: referrals,
                metadata: {
                    page,
                    totalPages: Math.ceil(total / limit),
                    total,
                    limit,
                    hasNextPage: page < Math.ceil(total / limit),
                    hasPrevPage: page > 1,
                },
                message: "Referrals retrieved successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to retrieve referrals",
            });
        }
    },
    async getPatientVitals(req, res) {
        // Implementation for getting vitals by patientId
        try {
            const { id } = req.params;

            if (!id) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "patientId is required",
                });
            }
            const vitalsRecords = await prisma.patientVitals.findMany({
                where: {
                    patientId: String(id),
                },
                include: {
                    vitals: true,
                },
                orderBy: {
                    time: "desc",
                },
            });
            return apiSuccess(res, {
                data: vitalsRecords,
                message: "Patient vitals retrieved successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to retrieve patient vitals",
            });
        }
    },
    async getPatientDiet(req, res) {
        // Implementation for getting patient diet
        try {
            const { id } = req.params;
            if (!id) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "patientId is required",
                });
            }
            const dietRecords = await prisma.diet.findMany({
                where: {
                    patientId: String(id),
                },
                orderBy: {
                    createdAt: "desc",
                },
            });
            return apiSuccess(res, {
                data: dietRecords,
                message: "Patient diet records retrieved successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to retrieve patient diet records",
            });
        }
    },
    async getPatientHistory(req, res) {
        try {
            const appointmentId = req.params.id as string;
            const query = req.query;

            const isIncluded = (param: string) => query[param] === "" || query[param] === "true" || query[param] === "1";

            // Single query to get admission with patient data
            const appointment = await prisma.appointment.findUnique({
                where: { id: appointmentId },
                select: {
                    id: true,
                    patientId: true,
                    patient: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    fName: true,
                                    lName: true,
                                    email: true,
                                    phoneNumber: true,
                                    bloodGroup: true,
                                },
                            },
                            ...(isIncluded("physioTherapy") && {
                                physioTherapy: {
                                    orderBy: { sessionDate: "desc" },
                                    include: {
                                        doctor: {
                                            select: {
                                                user: {
                                                    select: {
                                                        id: true,
                                                        fName: true,
                                                        lName: true,
                                                    },
                                                },
                                                department: {
                                                    select: { id: true, name: true, speciality: true },
                                                },
                                            },
                                        },
                                        physioConfig: true,
                                    },
                                },
                            }),
                            ...(isIncluded("medicalHistories") && {
                                medicalHistories: { orderBy: { startDate: "desc" } },
                            }),
                            ...(isIncluded("visitsBy") && {
                                visitsBy: {
                                    include: {
                                        doctor: {
                                            include: {
                                                user: {
                                                    select: {
                                                        id: true,
                                                        email: true,
                                                        fName: true,
                                                        lName: true,
                                                        phoneNumber: true,
                                                    },
                                                },
                                                department: {
                                                    select: { id: true, name: true, speciality: true },
                                                },
                                                qualification: { select: { id: true, name: true } },
                                            },
                                        },
                                        prescriptions: {
                                            include: {
                                                prescriptionItems: { include: { item: true } },
                                            },
                                        },
                                        labOrders: true,
                                        documents: true,
                                    },
                                    orderBy: { visitDate: "desc" },
                                },
                            }),
                            ...(isIncluded("patientVitals") && {
                                patientVitals: {
                                    include: {
                                        vitals: true,
                                        employee: {
                                            include: {
                                                user: {
                                                    select: {
                                                        id: true,
                                                        fName: true,
                                                        lName: true,
                                                        isDoctor: true,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                    orderBy: { time: "desc" },
                                },
                            }),
                            ...(isIncluded("patientAppointments") && {
                                patientAppointments: {
                                    where: { status: { not: AppointmentStatus.CANCELLED } },
                                    orderBy: { appointmentDate: "desc" },
                                    take: 1,
                                    include: {
                                        doctor: {
                                            include: {
                                                user: {
                                                    select: {
                                                        id: true,
                                                        email: true,
                                                        fName: true,
                                                        lName: true,
                                                        phoneNumber: true,
                                                    },
                                                },
                                                department: {
                                                    select: { id: true, name: true, speciality: true },
                                                },
                                                qualification: { select: { id: true, name: true } },
                                            },
                                        },
                                    },
                                },
                            }),
                            ...(isIncluded("referrals") && {
                                referrals: {
                                    select: {
                                        id: true,
                                        referralName: true,
                                        referralContact: true,
                                        referralType: true,
                                        concessionPercentage: true,
                                        referralUser: {
                                            select: {
                                                id: true,
                                                referralName: true,
                                                referralContact: true,
                                                referralType: true,
                                                concessionPercentage: true,
                                                referralEmployee: {
                                                    select: {
                                                        user: {
                                                            select: {
                                                                fName: true,
                                                                lName: true,
                                                                phoneNumber: true,
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                        referralEmployee: {
                                            select: {
                                                id: true,
                                                user: {
                                                    select: {
                                                        fName: true,
                                                        lName: true,
                                                        phoneNumber: true,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                    orderBy: { referralDate: "desc" },
                                },
                            }),
                            ...(isIncluded("labOrders") && {
                                labOrders: {
                                    include: {
                                        doctor: {
                                            select: {
                                                id: true,
                                                user: {
                                                    select: {
                                                        id: true,
                                                        email: true,
                                                        fName: true,
                                                        lName: true,
                                                        phoneNumber: true,
                                                    },
                                                },
                                            },
                                        },
                                        visit: {
                                            select: {
                                                id: true,
                                                visitDate: true,
                                                chiefComplaint: true,
                                            },
                                        },
                                        testIds: {
                                            include: {
                                                parameters: true,
                                            },
                                        },
                                    },
                                    orderBy: { orderDate: "desc" },
                                },
                            }),
                            ...(isIncluded("medicalDocuments") && {
                                medicalDocuments: { orderBy: { uploadDate: "desc" } },
                            }),
                            ...(isIncluded("prescribedTo") && {
                                prescribedTo: {
                                    include: {
                                        prescriptionItems: {
                                            select: {
                                                id: true,
                                                duration: true,
                                                dosage: true,
                                                frequency: true,
                                                item: {
                                                    select: {
                                                        id: true,
                                                        name: true,
                                                        strength: true,
                                                        unit: true,
                                                        brand: true,
                                                    },
                                                },
                                            },
                                        },
                                        doctor: {
                                            select: {
                                                user: {
                                                    select: {
                                                        id: true,
                                                        fName: true,
                                                        lName: true,
                                                        phoneNumber: true,
                                                    },
                                                },
                                                department: { select: { id: true, name: true } },
                                            },
                                        },
                                    },
                                    orderBy: { createdAt: "desc" },
                                },
                            }),
                            ...(isIncluded("patientDiets") && {
                                patientDiets: {
                                    orderBy: { createdAt: "desc" },
                                },
                            }),
                            ...(isIncluded("treatments") && {
                                treatments: {
                                    include: {
                                        treatmentConfiguration: true,
                                        doctor: {
                                            select: {
                                                user: {
                                                    select: {
                                                        id: true,
                                                        fName: true,
                                                        lName: true,
                                                    },
                                                },
                                                department: { select: { id: true, name: true } },
                                            },
                                        },
                                    },
                                    orderBy: { createdAt: "desc" },
                                },
                            }),
                            ...(isIncluded("dischargeSummaries") && {
                                dischargeSummaries: {
                                    include: {
                                        doctor: {
                                            include: {
                                                user: {
                                                    select: { id: true, fName: true, lName: true },
                                                },
                                            },
                                        },
                                    },
                                    orderBy: { dischargeDate: "desc" },
                                    where: { dischargeDate: { lt: new Date() } },
                                },
                            }),
                        },
                    },
                },
            });

            if (!appointment?.patient) {
                return res.status(404).json({ message: "Appointment or patient not found" });
            }

            const { patient } = appointment;
            const {
                user,
                physioTherapy,
                medicalHistories,
                visitsBy,
                patientVitals,
                patientAppointments,
                referrals,
                labOrders,
                medicalDocuments,
                prescribedTo,
                patientDiets,
                treatments,
                dischargeSummaries,
                ...patientInfo
            } = patient;

            return apiSuccess(res, {
                data: {
                    patientInfo: {
                        id: patientInfo.id,
                        age: patientInfo.age,
                        gender: patientInfo.gender,
                        policyHolderName: patientInfo.policyHolderName,
                        policyExpiryDate: patientInfo.policyExpiryDate,
                        tpaName: patientInfo.tpaName,
                        insuranceProvider: patientInfo.insuranceProvider,
                        policyNumber: patientInfo.policyNumber,
                        emergencyContact: patientInfo.emergencyContact,
                        emegencyContactName: patientInfo.emergencyContactName,
                        emergencyContactNotes: patientInfo.emergencyContactNotes,
                    },
                    user: user
                        ? {
                              id: user.id,
                              name: `${user.fName || ""} ${user.lName || ""}`.trim(),
                              email: user.email,
                              phoneNumber: user.phoneNumber,
                              bloodGroup: user.bloodGroup,
                          }
                        : null,
                    ...(physioTherapy && { physioTherapy }),
                    ...(medicalHistories && { medicalHistories }),
                    ...(visitsBy && { visits: visitsBy }),
                    ...(patientVitals && { patientVitals }),
                    ...(patientAppointments && { patientAppointments }),
                    ...(referrals && { referrals }),
                    ...(labOrders && { labOrders }),
                    ...(medicalDocuments && { medicalDocuments }),
                    ...(prescribedTo && { prescribedTo }),
                    ...(patientDiets && { diets: patientDiets }),
                    ...(treatments && { treatments }),
                    ...(dischargeSummaries && { dischargeSummaries }),
                },
                message: "Patient history retrieved successfully",
            });
        } catch (error) {
            console.error("Error fetching inpatient history:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to retrieve inpatient history",
            });
        }
    },
    async getInPatientHistory(req, res) {
        try {
            const admissionId = req.params.id as string;
            const query = req.query;

            const isIncluded = (param: string) => query[param] === "" || query[param] === "true" || query[param] === "1";

            // Single query to get admission with patient data
            const admission = await prisma.admission.findUnique({
                where: { id: admissionId },
                select: {
                    id: true,
                    patientId: true,
                    patient: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    fName: true,
                                    lName: true,
                                    email: true,
                                    phoneNumber: true,
                                    bloodGroup: true,
                                },
                            },
                            ...(isIncluded("physioTherapy") && {
                                physioTherapy: {
                                    orderBy: { sessionDate: "desc" },
                                    include: {
                                        doctor: {
                                            select: {
                                                user: {
                                                    select: {
                                                        id: true,
                                                        fName: true,
                                                        lName: true,
                                                    },
                                                },
                                                department: {
                                                    select: { id: true, name: true, speciality: true },
                                                },
                                            },
                                        },
                                        physioConfig: true,
                                    },
                                },
                            }),
                            ...(isIncluded("medicalHistories") && {
                                medicalHistories: { orderBy: { startDate: "desc" } },
                            }),
                            ...(isIncluded("visitsBy") && {
                                visitsBy: {
                                    include: {
                                        doctor: {
                                            select: {
                                                user: {
                                                    select: {
                                                        id: true,
                                                        email: true,
                                                        fName: true,
                                                        lName: true,
                                                        phoneNumber: true,
                                                    },
                                                },
                                                department: {
                                                    select: { id: true, name: true, speciality: true },
                                                },
                                                qualification: { select: { id: true, name: true } },
                                            },
                                        },
                                        prescriptions: {
                                            include: {
                                                prescriptionItems: { include: { item: true } },
                                            },
                                        },
                                        labOrders: true,
                                        documents: true,
                                    },
                                    orderBy: { visitDate: "desc" },
                                },
                            }),
                            ...(isIncluded("patientVitals") && {
                                patientVitals: {
                                    include: {
                                        vitals: true,
                                        employee: {
                                            select: {
                                                user: {
                                                    select: {
                                                        id: true,
                                                        fName: true,
                                                        lName: true,
                                                        isDoctor: true,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                    orderBy: { time: "desc" },
                                },
                            }),
                            ...(isIncluded("admissions") && {
                                admissions: {
                                    where: { status: { not: AdmissionStatus.CANCELLED } },
                                    orderBy: { admissionDateTime: "desc" },
                                    take: 1,
                                    include: {
                                        admittingDoctor: {
                                            select: {
                                                user: {
                                                    select: {
                                                        id: true,
                                                        email: true,
                                                        fName: true,
                                                        lName: true,
                                                        phoneNumber: true,
                                                    },
                                                },
                                                department: {
                                                    select: { id: true, name: true, speciality: true },
                                                },
                                                qualification: { select: { id: true, name: true } },
                                            },
                                        },
                                        staySession: {
                                            select: {
                                                id: true,
                                            },
                                        },
                                    },
                                },
                            }),
                            ...(isIncluded("referrals") && {
                                referrals: {
                                    where: {
                                        appointmentId: null,
                                    },
                                    select: {
                                        id: true,
                                        referralName: true,
                                        referralContact: true,
                                        referralType: true,
                                        concessionPercentage: true,
                                        referralUser: {
                                            select: {
                                                id: true,
                                                referralName: true,
                                                referralContact: true,
                                                referralType: true,
                                                concessionPercentage: true,
                                                referralEmployee: {
                                                    select: {
                                                        user: {
                                                            select: {
                                                                fName: true,
                                                                lName: true,
                                                                phoneNumber: true,
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                        referralEmployee: {
                                            select: {
                                                id: true,
                                                user: {
                                                    select: {
                                                        fName: true,
                                                        lName: true,
                                                        phoneNumber: true,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                    orderBy: { referralDate: "desc" },
                                },
                            }),
                            ...(isIncluded("labOrders") && {
                                labOrders: {
                                    include: {
                                        doctor: {
                                            select: {
                                                id: true,
                                                user: {
                                                    select: {
                                                        id: true,
                                                        email: true,
                                                        fName: true,
                                                        lName: true,
                                                        phoneNumber: true,
                                                    },
                                                },
                                            },
                                        },
                                        visit: {
                                            select: {
                                                id: true,
                                                visitDate: true,
                                                chiefComplaint: true,
                                            },
                                        },
                                        testIds: {
                                            include: {
                                                parameters: true,
                                            },
                                        },
                                    },
                                    orderBy: { orderDate: "desc" },
                                },
                            }),
                            ...(isIncluded("medicalDocuments") && {
                                medicalDocuments: { orderBy: { uploadDate: "desc" } },
                            }),
                            ...(isIncluded("roomBookingsfor") && {
                                roomBookingsfor: {
                                    select: {
                                        id: true,
                                        roomId: true,
                                        appointmentId: true,
                                        doctorId: true,
                                        patientId: true,
                                        status: true,
                                        room: {
                                            select: {
                                                id: true,
                                                roomNumber: true,
                                                name: true,
                                                capacity: true,
                                                status: true,
                                                currentOccupancy: true,
                                                floor: {
                                                    select: {
                                                        id: true,
                                                        name: true,
                                                        building: {
                                                            select: { id: true, name: true, branchId: true },
                                                        },
                                                    },
                                                },
                                                roomType: { select: { id: true, name: true } },
                                            },
                                        },
                                    },
                                    orderBy: { startTime: "desc" },
                                },
                            }),
                            ...(isIncluded("prescribedTo") && {
                                prescribedTo: {
                                    include: {
                                        prescriptionItems: {
                                            select: {
                                                id: true,
                                                dosage: true,
                                                frequency: true,
                                                duration: true,
                                                timing: true,
                                                item: {
                                                    select: {
                                                        id: true,
                                                        name: true,
                                                        strength: true,
                                                        unit: true,
                                                        brand: true,
                                                    },
                                                },
                                            },
                                        },
                                        doctor: {
                                            select: {
                                                user: {
                                                    select: {
                                                        id: true,
                                                        email: true,
                                                        fName: true,
                                                        lName: true,
                                                        phoneNumber: true,
                                                    },
                                                },
                                                department: { select: { id: true, name: true } },
                                            },
                                        },
                                    },
                                    orderBy: { createdAt: "desc" },
                                },
                            }),
                            ...(isIncluded("patientDiets") && {
                                patientDiets: {
                                    orderBy: { createdAt: "desc" },
                                },
                            }),
                            ...(isIncluded("patientMeals") && {
                                patientMeals: {
                                    include: {
                                        patientMealFoodItems: {
                                            select: {
                                                id: true,
                                                foodItemId: true,
                                                quantity: true,
                                                foodItem: true,
                                            },
                                        },
                                    },
                                    orderBy: { createdAt: "desc" },
                                },
                            }),
                            ...(isIncluded("patientProcedures") && {
                                patientProcedures: {
                                    include: {
                                        surgery: {
                                            select: {
                                                id: true,
                                                name: true,
                                                description: true,
                                                duration: true,
                                                status: true,
                                            },
                                        },
                                        doctors: {
                                            select: {
                                                id: true,
                                                user: {
                                                    select: { id: true, fName: true, lName: true },
                                                },
                                                department: { select: { id: true, name: true } },
                                            },
                                        },
                                        supportingStaff: {
                                            select: {
                                                id: true,
                                                user: {
                                                    select: { id: true, fName: true, lName: true },
                                                },

                                                department: { select: { id: true, name: true } },
                                            },
                                        },
                                    },
                                    orderBy: { createdAt: "desc" },
                                },
                            }),
                            ...(isIncluded("treatments") && {
                                treatments: {
                                    include: {
                                        treatmentConfiguration: true,
                                        doctor: {
                                            select: {
                                                user: {
                                                    select: {
                                                        id: true,
                                                        fName: true,
                                                        lName: true,
                                                    },
                                                },
                                                department: { select: { id: true, name: true } },
                                            },
                                        },
                                    },
                                    orderBy: { createdAt: "desc" },
                                },
                            }),
                            ...(isIncluded("dischargeSummaries") && {
                                dischargeSummaries: {
                                    include: {
                                        doctor: {
                                            select: {
                                                user: {
                                                    select: { id: true, fName: true, lName: true },
                                                },
                                            },
                                        },
                                        followUpDoctor: {
                                            select: {
                                                user: {
                                                    select: { id: true, fName: true, lName: true },
                                                },
                                            },
                                        },
                                    },
                                    orderBy: { dischargeDate: "desc" },
                                },
                            }),
                        },
                    },
                },
            });

            if (!admission?.patient) {
                return res.status(404).json({ message: "Admission or patient not found" });
            }

            const { patient } = admission;
            const {
                user,
                physioTherapy,
                medicalHistories,
                visitsBy,
                patientVitals,
                admissions,
                referrals,
                labOrders,
                medicalDocuments,
                roomBookingsfor,
                prescribedTo,
                patientDiets,
                patientMeals,
                patientProcedures,
                treatments,
                dischargeSummaries,
                ...patientInfo
            } = patient;

            return apiSuccess(res, {
                data: {
                    patientInfo: {
                        id: patientInfo.id,
                        age: patientInfo.age,
                        gender: patientInfo.gender,
                        policyHolderName: patientInfo.policyHolderName,
                        policyExpiryDate: patientInfo.policyExpiryDate,
                        tpaName: patientInfo.tpaName,
                        insuranceProvider: patientInfo.insuranceProvider,
                        policyNumber: patientInfo.policyNumber,
                        emergencyContact: patientInfo.emergencyContact,
                        emegencyContactName: patientInfo.emergencyContactName,
                        emergencyContactNotes: patientInfo.emergencyContactNotes,
                    },
                    user: user
                        ? {
                              id: user.id,
                              name: `${user.fName || ""} ${user.lName || ""}`.trim(),
                              email: user.email,
                              phoneNumber: user.phoneNumber,
                              bloodGroup: user.bloodGroup,
                          }
                        : null,
                    ...(physioTherapy && { physioTherapy }),
                    ...(medicalHistories && { medicalHistories }),
                    ...(visitsBy && { visits: visitsBy }),
                    ...(patientVitals && { patientVitals }),
                    ...(admissions && { admissions }),
                    ...(referrals && { referrals }),
                    ...(labOrders && { labOrders }),
                    ...(medicalDocuments && { medicalDocuments }),
                    ...(roomBookingsfor && { roomBookingsfor }),
                    ...(prescribedTo ? { prescribedTo } : {}),
                    ...(patientDiets && { diets: patientDiets }),
                    ...(patientMeals && { patientMeals }),
                    ...(patientProcedures && { patientProcedures }),
                    ...(treatments && { treatments }),
                    ...(dischargeSummaries && { dischargeSummaries }),
                },
                message: "Patient history retrieved successfully",
            });
        } catch (error) {
            console.error("Error fetching inpatient history:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to retrieve inpatient history",
            });
        }
    },
    async addVitals(req, res) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user?.id },
            });
            if (!user) {
                return apiError(res, {
                    statusCode: "UNAUTHORIZED",
                    message: "User not found or unauthorized",
                });
            }
            const emp = await prisma.employeeInfo.findUnique({
                where: { userId: req.user?.id },
            });

            if (!emp) {
                return apiError(res, {
                    statusCode: "NOT_FOUND",
                    message: "User profile not found",
                });
            }
            const {
                patientId,
                time,
                temperature,
                bp,
                pulse,
                spo2,
                bloodSugar,
                weight,
                weightUnit,
                height,
                heightUnit,
                bloodSugarUnit,
                temperatureUnit,
                bpUnit,
                pulseUnit,
                spo2Unit,
                appointmentId,
                admissionId,
            } = req.body;

            if (!patientId) {
                return res.status(400).json({ message: "patientId required" });
            }
            const result = await prisma.$transaction(
                async (tx) => {
                    // 1. Create the vitals record
                    const vitals = await tx.vitals.create({
                        data: {
                            temperature: temperature,
                            bp: bp || "",
                            pulse: pulse || "",
                            spo2: spo2 || "",
                            bloodSugar: bloodSugar || "",
                            height: (height as string) || "",
                            weight: (weight as string) || "",
                            heightUnit: heightUnit || "cm",
                            weightUnit: weightUnit || "kg",
                            temperatureUnit: temperatureUnit || "°F",
                            bpUnit: bpUnit || "mmHg",
                            pulseUnit: pulseUnit || "bpm",
                            spo2Unit: spo2Unit || "%",
                            bloodSugarUnit: bloodSugarUnit || "mg/dL",
                        },
                    });

                    // 2. Link vitals to patient
                    const patientVitals = await tx.patientVitals.create({
                        data: {
                            patientId: patientId,
                            vitalsId: vitals.id,
                            appointmentId: appointmentId,
                            admissionId: admissionId,
                            recordedBy: emp?.id,
                            time: time ? new Date(time) : new Date(),
                        },
                        include: {
                            patient: {
                                select: {
                                    id: true,
                                    user: {
                                        select: {
                                            fName: true,
                                            lName: true,
                                        },
                                    },
                                },
                            },
                            vitals: true,
                        },
                    });
                    const medicalHistory = await tx.medicalHistory.create({
                        data: {
                            appointmentId: appointmentId,
                            admissionId: admissionId,
                            patientId: patientId,
                            patientVitalsId: patientVitals.id,
                        },
                    });

                    return patientVitals;
                },
                {
                    maxWait: 60000,
                    timeout: 60000,
                },
            );
            return apiSuccess(res, {
                data: result,
                message: "Vitals added successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to add vitals",
            });
        }
    },
    async getPatientMedicalHistory(req, res) {
        try {
            const id = req.params.id as string;
            const { date, doctorId, patientType } = req.query;
            if (!id) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "Patient ID is required",
                });
            }
            // Build the where clause for medicalHistory
            const whereClause: any = {
                patientId: id,
            };

            // Doctor filter - check all possible relations
            if (doctorId) {
                whereClause.AND = [
                    {
                        OR: [
                            { admission: { admittingDoctorId: doctorId as string } },
                            { appointment: { doctorId: doctorId as string } },
                            { visit: { doctorId: doctorId as string } },
                            { patientVitals: { recordedBy: doctorId as string } },
                            { labOrder: { doctorId: doctorId as string } },
                            { prescription: { doctorId: doctorId as string } },
                            { treatment: { doctorId: doctorId as string } },
                            { physioTherapy: { doctorId: doctorId as string } },
                            {
                                patientProcedure: {
                                    doctors: {
                                        some: {
                                            id: doctorId as string,
                                        },
                                    },
                                },
                            },
                            { dischargeSummary: { doctorId: doctorId as string } },
                            { recordedByUserId: doctorId as string },
                        ],
                    },
                ];
            }

            // Date filter
            if (date) {
                const dateFilter = new Date(date as string);
                const nextDay = new Date(dateFilter);
                nextDay.setDate(dateFilter.getDate() + 1);
                whereClause.createdAt = {
                    gte: dateFilter,
                    lt: nextDay,
                };
            }

            // Patient Type filter
            if (patientType) {
                if (patientType === "inpatient") {
                    whereClause.AND = whereClause.AND || [];
                    whereClause.AND.push({
                        OR: [{ admissionId: { not: null } }, { patientProcedureId: { not: null } }, { dischargeSummaryId: { not: null } }],
                    });
                } else if (patientType === "outpatient") {
                    whereClause.AND = whereClause.AND || [];
                    whereClause.AND.push({
                        OR: [{ appointmentId: { not: null } }, { visit: { appointmentId: { not: null } } }],
                    });
                }
            }
            const patientMedicalHistory = await prisma.medicalHistory.findMany({
                where: whereClause,
                select: {
                    id: true,
                    type: true,
                    condition: true,
                    notes: true,
                    createdAt: true,
                    updatedAt: true,
                    patient: {
                        select: {
                            id: true,
                            age: true,
                            gender: true,
                            emergencyContactName: true,
                            emergencyContact: true,
                            emergencyContactNotes: true,
                            insuranceProvider: true,
                            policyNumber: true,
                            policyHolderName: true,
                            policyExpiryDate: true,
                            tpaName: true,
                            user: {
                                select: {
                                    fName: true,
                                    lName: true,
                                    email: true,
                                    phoneNumber: true,
                                },
                            },
                        },
                    },
                    admission: {
                        select: {
                            id: true,
                            admissionDateTime: true,
                            actualDischarge: true,
                            admittingDoctor: {
                                select: {
                                    id: true,
                                    user: {
                                        select: {
                                            fName: true,
                                            lName: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    appointment: {
                        select: {
                            id: true,
                            appointmentDate: true,
                            paidAmount: true,
                            doctor: {
                                select: {
                                    id: true,
                                    user: {
                                        select: {
                                            fName: true,
                                            lName: true,
                                        },
                                    },
                                },
                            },
                            referral: {
                                select: {
                                    referralEmployeeId: true,
                                    referralName: true,
                                    referralContact: true,
                                    referralType: true,
                                    concessionPercentage: true,
                                },
                            },
                        },
                    },
                    patientVitals: {
                        select: {
                            id: true,
                            employee: {
                                select: {
                                    id: true,
                                    user: {
                                        select: {
                                            fName: true,
                                            lName: true,
                                        },
                                    },
                                },
                            },
                            vitals: {
                                select: {
                                    id: true,
                                    temperature: true,
                                    bp: true,
                                    pulse: true,
                                    spo2: true,
                                    bloodSugar: true,
                                    height: true,
                                    weight: true,
                                    heightUnit: true,
                                    weightUnit: true,
                                    temperatureUnit: true,
                                    bpUnit: true,
                                    pulseUnit: true,
                                    spo2Unit: true,
                                    bloodSugarUnit: true,
                                },
                            },
                        },
                    },
                    visit: {
                        select: {
                            id: true,
                            visitDate: true,
                            chiefComplaint: true,
                            appointmentId: true,
                            examination: true,
                            diagnosis: true,
                            history: true,
                            testReportsToCarry: true,
                            nextReviewDate: true,
                            doctor: {
                                select: {
                                    id: true,
                                    user: {
                                        select: {
                                            fName: true,
                                            lName: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    prescription: {
                        select: {
                            id: true,
                            prescriptionItems: {
                                select: {
                                    id: true,
                                    itemId: true,
                                    dosage: true,
                                    frequency: true,
                                    duration: true,
                                    timing: true,
                                    item: {
                                        select: {
                                            name: true,
                                            strength: true,
                                            brand: true,
                                            genericName: true,
                                        },
                                    },
                                },
                            },
                            doctor: {
                                select: {
                                    id: true,
                                    user: {
                                        select: {
                                            fName: true,
                                            lName: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    labOrder: {
                        select: {
                            id: true,
                            testIds: true,
                            doctor: {
                                select: {
                                    id: true,
                                    user: {
                                        select: {
                                            fName: true,
                                            lName: true,
                                        },
                                    },
                                },
                            },
                            visit: {
                                select: {
                                    id: true,
                                    visitDate: true,
                                    chiefComplaint: true,
                                    diagnosis: true,
                                },
                            },
                        },
                    },
                    patientProcedure: {
                        select: {
                            id: true,
                            doctors: {
                                select: {
                                    id: true,
                                    user: {
                                        select: {
                                            fName: true,
                                            lName: true,
                                        },
                                    },
                                    department: { select: { id: true, name: true } },
                                },
                            },
                            supportingStaff: {
                                select: {
                                    id: true,
                                    user: {
                                        select: {
                                            fName: true,
                                            lName: true,
                                        },
                                    },
                                    department: { select: { id: true, name: true } },
                                },
                            },
                            surgeryId: true,
                            surgeryDate: true,
                            admissionId: true,
                            externalDoctor: true,
                            externalDoctorSpeciality: true,
                            diagnosis: true,
                            status: true,
                            postOperativeNotes: true,
                            followUpDate: true,
                            hospitalName: true,
                            surgery: {
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                    duration: true,
                                },
                            },
                        },
                    },
                    physioTherapy: {
                        include: {
                            physioConfig: true,
                            doctor: {
                                select: {
                                    user: {
                                        select: {
                                            id: true,
                                            fName: true,
                                            lName: true,
                                        },
                                    },
                                    department: { select: { id: true, name: true } },
                                },
                            },
                        },
                    },
                    treatment: {
                        include: {
                            treatmentConfiguration: {
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                },
                            },
                            doctor: {
                                select: {
                                    user: {
                                        select: {
                                            id: true,
                                            fName: true,
                                            lName: true,
                                        },
                                    },
                                    department: { select: { id: true, name: true } },
                                },
                            },
                        },
                    },
                    diet: true,
                    dischargeSummary: {
                        include: {
                            doctor: {
                                select: {
                                    user: {
                                        select: {
                                            id: true,
                                            fName: true,
                                            lName: true,
                                        },
                                    },
                                    department: { select: { id: true, name: true } },
                                },
                            },
                            admission: {
                                include: {
                                    staySession: {
                                        include: {
                                            currentRoomBooking: {
                                                include: {
                                                    room: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            });
            const enrichedHistory = await Promise.all(
                patientMedicalHistory.map(async (record) => {
                    const surgeryId = record.patientProcedure?.surgeryId;
                    if (!surgeryId) return record;
                    const cost = await getActivePriceAmount(PriceEntityType.SURGERY, surgeryId);
                    return {
                        ...record,
                        patientProcedure: {
                            ...record.patientProcedure,
                            surgery: { ...record?.patientProcedure?.surgery, cost },
                        },
                    };
                }),
            );
            return apiSuccess(res, {
                data: enrichedHistory,
                message: "Patient medical history fetched successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to retrieve patient medical history",
            });
        }
    },
    async addDiet(req, res) {
        try {
            const { patientId, specialInstructions, dieticianNotes, dieticianName, admissionId } = req.body;

            if (!patientId) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "patientId is required",
                });
            }
            const result = await prisma.$transaction(
                async (tx) => {
                    const dietRecord = await tx.diet.create({
                        data: {
                            patientId,
                            specialInstructions: specialInstructions,
                            dieticianNotes: dieticianNotes,
                            dieticianName: dieticianName,
                            admissionId: admissionId,
                        },
                    });
                    const medicalHistory = await tx.medicalHistory.create({
                        data: {
                            patientId: patientId,
                            dietId: dietRecord.id,
                            admissionId: admissionId,
                        },
                    });
                    return dietRecord;
                },
                {
                    maxWait: 60000,
                    timeout: 60000,
                },
            );

            return apiSuccess(res, {
                data: result,
                message: "Diet added successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to add diet",
            });
        }
    },
    async addVisit(req, res) {
        try {
            const { patientId, doctorId, chiefComplaint, admissionId, diagnosis, visitDate, history, examination, visitType, inpatientStaySessionId } = req.body;
            if (!doctorId || !patientId || !diagnosis || !visitDate) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "doctorId, patientId, diagnosis, and visitDate are required",
                });
            }
            // Check if doctor exists
            const doctorExists = await prisma.employeeInfo.findUnique({
                where: { id: String(doctorId) },
            });

            if (!doctorExists) {
                return res.status(400).json({ message: "Doctor not found with the provided ID" });
            }

            // Check if patient exists
            const patientExists = await prisma.patientInfo.findUnique({
                where: { id: patientId },
            });

            if (!patientExists) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "Patient not found with the provided ID",
                });
            }
            const result = await prisma.$transaction(
                async (tx) => {
                    const visit = await tx.visit.create({
                        data: {
                            patientId: patientId,
                            doctorId: String(doctorId),
                            chiefComplaint: chiefComplaint,
                            diagnosis: diagnosis,
                            history: history || null,
                            examination: examination || null,
                            visitDate: new Date(visitDate),
                            inpatientStaySessionId: inpatientStaySessionId,
                            visitType: visitType || "GENERAL",
                        },
                    });
                    const medicalHistory = await tx.medicalHistory.create({
                        data: {
                            admissionId: admissionId,
                            patientId: patientId,
                            visitId: visit.id,
                        },
                    });

                    // Add Consultation Charge to Bill
                    await addItemToBill({
                        patientId,
                        entityId: String(doctorId),
                        entityType: BillItemType.CONSULTATION,
                        tx,
                        billType: "IPD",
                        admissionId: admissionId || null,
                    });

                    return visit;
                },
                {
                    maxWait: 60000,
                    timeout: 60000,
                },
            );
            return apiSuccess(res, {
                data: result,
                message: "Visit added successfully",
            });
        } catch (error) {
            console.error("Error adding visit:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to add visit",
            });
        }
    },
    async addPrescription(req, res) {
        try {
            const { patientId, doctorId, prescriptionItems, notes, visitId } = req.body;

            if (!patientId) {
                return res.status(400).json({ message: "patientId is required" });
            }
            if (!Array.isArray(prescriptionItems) || prescriptionItems.length === 0) {
                return res.status(400).json({ message: "prescriptionItems must be a non-empty array" });
            }

            for (const item of prescriptionItems) {
                if (!item.itemId) {
                    return res.status(400).json({
                        message: "Each prescription item must have itemId and positive quantity",
                    });
                }
            }
            const prescription = await prisma.$transaction(async (tx) => {
                const patient = await tx.patientInfo.findUnique({
                    where: { id: patientId },
                    select: { id: true },
                });
                if (!patient) {
                    throw new Error("Patient not found");
                }

                const newPrescription = await tx.prescription.create({
                    data: {
                        doctorId: String(doctorId),
                        patientId,
                        visitId: visitId || null,
                        notes: notes || null,
                        prescriptionItems: {
                            create: prescriptionItems.map((item) => ({
                                itemId: item.itemId,
                                dosage: item.dosage,
                                frequency: item.frequency,
                                duration: item.duration,
                                timing: item.timing,
                            })),
                        },
                    },
                    select: {
                        id: true,
                        doctorId: true,
                        patientId: true,
                        visitId: true,
                        notes: true,
                        _count: {
                            select: {
                                prescriptionItems: true,
                            },
                        },
                        prescriptionItems: {
                            select: {
                                id: true,
                                itemId: true,
                                dosage: true,
                                frequency: true,
                                duration: true,
                            },
                        },
                    },
                });

                return newPrescription;
            });
            return apiSuccess(res, {
                data: prescription,
                message: "Prescription added successfully",
            });
        } catch (error) {
            console.error("Error adding prescription:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to add prescription",
            });
        }
    },
    async createLabOrder(req, res) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user?.id, isDoctor: true },
            });
            const doc = await prisma.employeeInfo.findUnique({
                where: { userId: req.user?.id },
            });

            const { patientId, doctorId, testIds, notes, orderDate, status, admissionId, visitId } = req.body;

            if (!user?.id || !patientId || !doctorId || !testIds?.length) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "doctorId,patientId and testIds (non-empty array) are required",
                });
            }

            const result = await prisma.$transaction(
                async (tx) => {
                    const labOrder = await tx.labOrder.create({
                        data: {
                            patientId,
                            doctorId: String(doctorId),
                            testIds: {
                                connect: testIds.map((testId: string) => ({ id: testId })),
                            },
                            notes,
                            admissionId: admissionId ?? null,
                            visitId: visitId ?? null,
                            status,
                            orderDate: orderDate ? new Date(orderDate) : new Date(),
                        },
                        include: labOrderInclude,
                    });

                    await tx.medicalHistory.create({
                        data: {
                            admissionId: admissionId ?? null,
                            patientId,
                            labOrderId: labOrder.id,
                        },
                    });
                    // Add each test to the Bill
                    for (const testId of testIds) {
                        await addItemToBill({
                            patientId,
                            entityId: testId,
                            entityType: BillItemType.LAB,
                            tx,
                            billType: "IPD",
                            admissionId: admissionId || null,
                        });
                    }
                    return labOrder;
                },
                { maxWait: 60000, timeout: 60000 },
            );

            const enrichedResult = await enrichOrderWithDynamicPricing(result);

            return apiSuccess(res, {
                data: enrichedResult,
                message: "Lab order created successfully",
            });
        } catch (error) {
            console.error("Error creating lab order:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to create lab order",
            });
        }
    },
    async searchPhysioTherapies(req, res) {
        try {
            const query: {
                search?: string;
            } = req.query;

            const search = query.search?.trim();
            const filters: Prisma.PhysioConfigurationWhereInput[] = [];
            if (search) {
                const orConditions: Prisma.PhysioConfigurationWhereInput["OR"] = [{ name: { contains: search, mode: "insensitive" } }];
                filters.push({ OR: orConditions });
            }
            const where: Prisma.PhysioConfigurationWhereInput = {
                AND: [...filters, { isActive: true }],
            };

            const items = await prisma.physioConfiguration.findMany({
                where: where,
                orderBy: { name: "desc" },
            });

            return apiSuccess(res, {
                data: items,
                message: "Physiotherapy names searched successfully",
            });
        } catch (error) {
            console.error("Search physiotherapy error:", error);
            return apiError(res, {
                message: "Failed to search physiotherapy",
            });
        }
    },
    async addPhysioTherapy(req, res) {
        try {
            const { patientId, doctorId, admissionId, physioConfigId, status, notes, sessionDate } = req.body;
            if (!doctorId || !patientId || !sessionDate || !physioConfigId) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "patientId,doctorId, sessionDate and physioConfigId are required",
                });
            }
            const result = await prisma.$transaction(
                async (tx) => {
                    const physioTherapy = await tx.physioTherapy.create({
                        data: {
                            patientId: patientId,
                            admissionId: admissionId,
                            doctorId: String(doctorId),
                            physioConfigId: physioConfigId,
                            notes: notes || null,
                            status: status || PhysioTherapyStatus.COMPLETED,
                            sessionDate: new Date(sessionDate) || new Date(),
                        },
                    });
                    await tx.medicalHistory.create({
                        data: {
                            admissionId: admissionId ?? null,
                            patientId,
                            physioTherapyId: physioTherapy.id,
                        },
                    });

                    // Add to Bill
                    await addItemToBill({
                        patientId,
                        entityId: physioConfigId, // We use the master physioConfigId for pricing
                        entityType: BillItemType.PHYSIOTHERAPY,
                        tx,
                        billType: "IPD",
                        admissionId: admissionId || null,
                    });

                    return physioTherapy;
                },
                { maxWait: 60000, timeout: 60000 },
            );

            return apiSuccess(res, {
                data: result,
                message: "Physiotherapy session added successfully",
            });
        } catch (error) {
            console.error("Error adding physiotherapy session:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to add physiotherapy session",
            });
        }
    },
    async searchMedicines(req, res) {
        try {
            const query: {
                search?: string;
            } = req.query;

            const search = query.search?.trim();
            const filters: Prisma.MedicalItemWhereInput[] = [];
            if (search) {
                const orConditions: Prisma.MedicalItemWhereInput[] = [
                    { name: { contains: search, mode: "insensitive" } },
                    { genericName: { contains: search, mode: "insensitive" } },
                    { brand: { contains: search, mode: "insensitive" } },
                ];
                filters.push({ OR: orConditions });
            }

            const where: Prisma.MedicalItemWhereInput = {
                AND: [
                    ...filters,
                    { isActive: true },
                    {
                        batches: {
                            some: {
                                isActive: true,
                                quantity: { gt: 0 },
                            },
                        },
                    },
                    {
                        isActive: true,
                    },
                ],
            };

            const items = await prisma.medicalItem.findMany({
                where: where,
                select: {
                    id: true,
                    name: true,
                    genericName: true,
                    brand: true,
                    strength: true,
                    unit: true,
                    itemType: true,
                    dosageForm: true,
                    batches: {
                        where: {
                            isActive: true,
                            quantity: { gt: 0 },
                        },
                        select: {
                            id: true,
                            batchNumber: true,
                            expiryDate: true,
                            quantity: true,
                        },
                        orderBy: { expiryDate: "asc" },
                        take: 1,
                    },
                },
                orderBy: { name: "asc" },
            });

            const response = await Promise.all(
                items.map(async (item) => {
                    const batch = item.batches[0];
                    const sellingPrice = batch ? await getActivePriceAmount(PriceEntityType.PHARMACY, batch.id) : 0;
                    return {
                        id: item.id,
                        label: `${item.name} ${item.strength || ""}${item.unit || ""} ${item.brand ? `(${item.brand})` : ""}`,
                        name: item.name,
                        genericName: item.genericName,
                        brand: item.brand,
                        strength: item.strength,
                        unit: item.unit,
                        dosageForm: item.dosageForm,
                        availableStock: item.batches.reduce((sum, b) => sum + b.quantity, 0),
                        batchId: batch?.id || null,
                        unitPrice: sellingPrice,
                    };
                }),
            );

            return apiSuccess(res, {
                data: response,
                message: "Medical items searched successfully",
            });
        } catch (error) {
            console.error("Search medical items error:", error);
            return apiError(res, {
                message: "Failed to search medical items",
            });
        }
    },
    async patientDischargeSummary(req, res) {
        try {
            const {
                admissionId,
                patientId,
                doctorId,
                dischargeDate,
                finalDiagnosis,
                proceduresPerformed,
                medicationsAdministered,
                dietInstructions,
                dischargeSummaryInstructions,
                patientInstructions,
                followUpAdvice,
            } = req.body;

            if (!admissionId || !patientId || !doctorId || !finalDiagnosis || !medicationsAdministered) {
                return res.status(400).json({
                    message: "admissionId, patientId, doctorId, finalDiagnosis, and medicationsAdministered are required",
                });
            }

            const result = await prisma.$transaction(
                async (tx) => {
                    const patient = await tx.patientInfo.findUnique({
                        where: { id: patientId },
                    });

                    if (!patient) {
                        throw new Error("Patient not found");
                    }

                    const admission = await tx.admission.findUnique({
                        where: { id: admissionId },
                    });

                    if (!admission) {
                        throw new Error("Admission not found");
                    }

                    if (admission.status !== "ADMITTED") {
                        throw new Error(`Cannot create discharge for admission with status: ${admission.status}`);
                    }

                    const existing = await tx.dischargeSummary.findUnique({
                        where: { admissionId: admissionId },
                    });

                    if (existing) {
                        throw new Error("Discharge summary already exists for this admission");
                    }

                    const dischargeSummary = await tx.dischargeSummary.create({
                        data: {
                            admissionId,
                            patientId,
                            doctorId,
                            dischargeDate: dischargeDate ? new Date(dischargeDate) : new Date(),
                            finalDiagnosis,
                            proceduresPerformed,
                            medicationsAdministered,
                            dietInstructions,
                            dischargeSummaryInstructions,
                            patientInstructions,
                            followUpAdvice,
                            approvedByDoctor: false,
                        },
                        include: {
                            patient: {
                                include: {
                                    user: true,
                                },
                            },
                            doctor: {
                                include: {
                                    user: true,
                                },
                            },
                            admission: true,
                        },
                    });

                    return dischargeSummary;
                },
                {
                    maxWait: 60000,
                    timeout: 60000,
                },
            );

            return apiSuccess(res, {
                data: result,
                message: "Discharge summary generated waiting for doctor's approval.",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to generate discharge summary",
            });
        }
    },
    async getDischargeSummaryByAdmissionId(req, res) {
        try {
            const { admissionId } = req.query;
            if (!admissionId) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "admissionId is required",
                });
            }

            const dischargeSummary = await prisma.dischargeSummary.findUnique({
                where: {
                    admissionId: admissionId as string,
                },
                include: {
                    patient: {
                        include: {
                            user: true,
                        },
                    },
                    doctor: {
                        include: {
                            user: true,
                        },
                    },
                    admission: true,
                },
            });

            if (!dischargeSummary) {
                return res.status(404).json({ message: "Discharge summary not found for this admission" });
            }

            return apiSuccess(res, {
                data: dischargeSummary,
                message: "Discharge summary retrieved successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to retrieve discharge summary",
            });
        }
    },
    async getPatientVisitsByAppointmentId(req, res) {
        try {
            const { id } = req.params;
            const visit = await prisma.visit.findMany({
                where: { appointmentId: id },
                select: {
                    diagnosis: true,
                    examination: true,
                    chiefComplaint: true,
                    history: true,
                    testReportsToCarry: true,
                    nextReviewDate: true,
                    appointment: {
                        select: {
                            id: true,
                            appointmentType: true,
                            appointmentDate: true,
                            status: true,
                            description: true,
                            endTime: true,
                            startTime: true,
                            title: true,
                            paidAmount: true,
                            referral: {
                                select: {
                                    referralEmployeeId: true,
                                    referralName: true,
                                    referralContact: true,
                                    referralType: true,
                                    concessionPercentage: true,
                                },
                            },
                            patient: {
                                select: {
                                    id: true,
                                    age: true,
                                    gender: true,
                                    user: {
                                        select: {
                                            id: true,
                                            fName: true,
                                            lName: true,
                                            email: true,
                                            phoneNumber: true,
                                            bloodGroup: true,
                                        },
                                    },
                                },
                            },
                            doctor: {
                                select: {
                                    id: true,
                                    age: true,
                                    qualification: true,
                                    experience: true,
                                    user: {
                                        select: {
                                            id: true,
                                            fName: true,
                                            lName: true,
                                            email: true,
                                            phoneNumber: true,
                                            bloodGroup: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    patientVitals: {
                        select: {
                            id: true,
                            patientId: true,
                            visitId: true,
                            time: true,
                            recordedBy: true,
                            createdAt: true,
                            vitals: {
                                omit: {
                                    updatedAt: true,
                                },
                            },
                            employee: {
                                include: {
                                    user: {
                                        select: {
                                            id: true,
                                            fName: true,
                                            lName: true,
                                            isDoctor: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    prescriptions: {
                        select: {
                            id: true,
                            patientId: true,
                            prescriptionItems: {
                                select: {
                                    id: true,
                                    itemId: true,
                                    dosage: true,
                                    frequency: true,
                                    duration: true,
                                    timing: true,
                                    item: {
                                        select: {
                                            name: true,
                                            strength: true,
                                            brand: true,
                                            genericName: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });
            const vitals = await prisma.patientVitals.findMany({
                where: {
                    appointmentId: id,
                },
                select: {
                    id: true,
                    patientId: true,
                    visitId: true,
                    time: true,
                    recordedBy: true,
                    createdAt: true,
                    vitals: {
                        omit: {
                            updatedAt: true,
                        },
                    },
                    employee: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    fName: true,
                                    lName: true,
                                    isDoctor: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    time: "desc",
                },
            });
            if (!visit) {
                return apiError(res, {
                    statusCode: "NOT_FOUND",
                    message: "Visit not found",
                });
            }
            return apiSuccess(res, {
                data: { visit, vitals },
                message: "Visit fetched successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch visit",
            });
        }
    },
    async roomTransfer(req, res) {
        const { staySessionId, fromRoomId, toRoomId, effectiveFrom, effectiveTo, reason, transferredBy, roomCharges } = req.body;

        if (!staySessionId || !toRoomId || !effectiveFrom) {
            return res.status(400).json({
                error: "staySessionId, toRoomId and effectiveFrom are required",
            });
        }
        try {
            const result = await prisma.$transaction(async (tx) => {
                // 1. Get and validate stay session
                const staySession = await tx.inpatientStaySession.findUnique({
                    where: { id: staySessionId },
                });
                if (!staySession) {
                    return apiError(res, {
                        message: "Unable to transfer room. Stay session not found",
                    });
                }

                if (staySession.status !== "ACTIVE") {
                    return apiError(res, {
                        message: "Unable to transfer room. Stay session is not active",
                    });
                }

                // 2. Get and validate destination room
                const toRoom = await tx.room.findUnique({
                    where: { id: toRoomId },
                });

                if (!toRoom) {
                    return apiError(res, {
                        message: "Unable to transfer room. Destination room not found",
                    });
                }
                if (toRoom.status !== "AVAILABLE") {
                    return apiError(res, {
                        message: "Unable to transfer room. Destination room is not available",
                    });
                }

                if (toRoom.currentOccupancy >= toRoom.capacity) {
                    return apiError(res, {
                        message: "Unable to transfer room. Destination room is full",
                    });
                }

                // 3. Get source room if provided

                const fromRoom = await tx.room.findUnique({
                    where: { id: fromRoomId },
                });

                if (!fromRoom) {
                    return apiError(res, {
                        message: "Unable to transfer room. Source room not found",
                    });
                }

                // 4. Create transfer record
                const transfer = await tx.stayTransfer.create({
                    data: {
                        staySessionId,
                        fromRoomId,
                        toRoomId,
                        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
                        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
                        reason,
                        transferredBy,
                        roomCharges,
                    },
                });

                // 5. Update source room occupancy (if moving from another room)
                if (fromRoomId) {
                    const newFromRoomOccupancy = fromRoom.currentOccupancy - 1;
                    await tx.room.update({
                        where: { id: fromRoomId },
                        data: {
                            status: fromRoom.capacity === fromRoom.currentOccupancy - 1 ? RoomStatus.OCCUPIED : RoomStatus.AVAILABLE,
                            currentOccupancy: {
                                decrement: 1,
                            },
                            // status: newFromRoomOccupancy <= 0 ? "AVAILABLE" : "OCCUPIED",
                        },
                    });
                }

                // 6. Update destination room occupancy
                const newOccupancy = toRoom.currentOccupancy + 1;
                await tx.room.update({
                    where: { id: toRoomId },
                    data: {
                        status: toRoom.capacity === toRoom.currentOccupancy + 1 ? RoomStatus.OCCUPIED : RoomStatus.AVAILABLE,
                        currentOccupancy: {
                            increment: 1,
                        },
                        // status: newOccupancy >= 1 ? "OCCUPIED" : "AVAILABLE",
                    },
                });
                // 7. Update room booking
                const booking = await tx.roomBooking.update({
                    where: { id: staySession.currentRoomBookingId as string },
                    data: {
                        roomId: toRoomId,
                        // startTime: effectiveFrom ? new Date(effectiveFrom) : new Date(),
                        endTime: effectiveTo ? new Date(effectiveTo) : null,
                    },
                });

                // 8. Update stay session with new room booking
                await tx.inpatientStaySession.update({
                    where: { id: staySessionId },
                    data: {
                        currentRoomBookingId: booking.id,
                    },
                });

                // 9. Add New Room Charge to Bill
                await addItemToBill({
                    patientId: staySession.patientId,
                    entityId: toRoom.roomTypeId,
                    entityType: BillItemType.ROOM,
                    tx,
                    billType: "IPD",
                    title: `Room Transfer: ${toRoom.roomNumber}`,
                    admissionId: staySession.admissionId,
                });

                // Return created transfer with relations
                return tx.stayTransfer.findUnique({
                    where: { id: transfer.id },
                    include: {
                        fromRoom: {
                            select: {
                                id: true,
                                roomNumber: true,
                                name: true,
                                floorId: true,
                            },
                        },
                        toRoom: {
                            select: {
                                id: true,
                                roomNumber: true,
                                name: true,
                                floorId: true,
                            },
                        },
                    },
                });
            }); // End of transaction

            // Success response
            return res.status(201).json({
                success: true,
                message: "Room transfer completed successfully",
                data: result,
            });
        } catch (error) {
            console.error("Transfer error:", error);

            // Default error response
            return res.status(500).json({
                success: false,
                error: "Failed to create room transfer",
            });
        }
    },
    async getRoomTransfer(req, res) {
        try {
            const { id } = req.params;
            const roomTransfer = await prisma.stayTransfer.findMany({
                where: { staySessionId: id },
                include: {
                    fromRoom: {
                        select: {
                            id: true,
                            roomNumber: true,
                            name: true,
                            floorId: true,
                            roomType: true,
                        },
                    },
                    toRoom: {
                        select: {
                            id: true,
                            roomNumber: true,
                            name: true,
                            floorId: true,
                            roomType: true,
                        },
                    },
                },
            });
            return apiSuccess(res, {
                data: roomTransfer,
                message: "Room transfer fetched successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch room transfer",
            });
        }
    },
    async getAllPatients(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
            const skip = (page - 1) * limit;
            const search = ((req.query.search as string) || "").toLowerCase();
            const patientType = ((req.query.patientType as string) || "").toLowerCase();
            const searchDate = ((req.query.date as string) || "").toLowerCase();
            const doctorName = ((req.query.doctorName as string) || "").toLowerCase();

            // Build where condition
            const where: Prisma.UserWhereInput = {
                isPatient: true,
            };
            const orConditions: Prisma.UserWhereInput[] = [];
            if (patientType === "inpatient") {
                // Patients with admissions (may or may not have appointments)
                where.patientInfo = {
                    admissions: { some: {} },
                };
            } else if (patientType === "outpatient") {
                // Patients with appointments only (no admissions)
                where.patientInfo = {
                    AND: [{ patientAppointments: { some: {} } }],
                };
            }
            let startDate;
            let endDate;
            if (searchDate) {
                startDate = new Date(searchDate);
                startDate.setUTCHours(0, 0, 0, 0);
                endDate = new Date(searchDate);
                endDate.setUTCHours(23, 59, 59, 999);
            }

            if (searchDate) {
                // Date filter
                const parsedDate = new Date(searchDate as string);
                if (!isNaN(parsedDate.getTime())) {
                    orConditions.push({
                        OR: [
                            {
                                patientInfo: {
                                    patientAppointments: {
                                        some: { startTime: { gte: startDate, lt: endDate } },
                                    },
                                },
                            },
                            {
                                patientInfo: {
                                    admissions: {
                                        some: {
                                            admissionDateTime: { gte: startDate, lt: endDate },
                                        },
                                    },
                                },
                            },
                        ],
                    });
                }
            }
            // Doctor name search
            if (doctorName) {
                const terms = doctorName.trim().split(/\s+/);

                // Build an AND condition for every term
                const termConditions: Prisma.UserWhereInput[] = terms.map((term) => ({
                    OR: [{ fName: { contains: term, mode: "insensitive" } }, { lName: { contains: term, mode: "insensitive" } }, { phoneNumber: { contains: term, mode: "insensitive" } }],
                }));

                orConditions.push({ AND: termConditions });
            }
            if (search) {
                const terms = search.trim().split(/\s+/);

                // Build an AND condition for every term
                const termConditions: Prisma.UserWhereInput[] = terms.map((term) => ({
                    OR: [{ fName: { contains: term, mode: "insensitive" } }, { lName: { contains: term, mode: "insensitive" } }, { phoneNumber: { contains: term, mode: "insensitive" } }],
                }));

                orConditions.push({ AND: termConditions });
            }

            // Combine all OR conditions with AND
            if (orConditions.length > 0) {
                where.AND = orConditions;
            }

            const [allPatients, total] = await Promise.all([
                prisma.user.findMany({
                    where,
                    select: {
                        id: true,
                        fName: true,
                        lName: true,
                        email: true,
                        phoneNumber: true,
                        bloodGroup: true,
                        patientInfo: {
                            select: {
                                id: true,
                                age: true,
                                gender: true,
                                patientAppointments: {
                                    select: {
                                        id: true,
                                        appointmentDate: true,
                                        startTime: true,
                                        status: true,
                                        doctorId: true,
                                        doctor: {
                                            select: {
                                                id: true,
                                                user: {
                                                    select: {
                                                        fName: true,
                                                        lName: true,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                    where: {
                                        startTime: {
                                            gte: startDate,
                                            lt: endDate,
                                        },
                                    },
                                    orderBy: {
                                        startTime: "desc",
                                    },
                                    take: 1,
                                },
                                admissions: {
                                    select: {
                                        id: true,
                                        admissionDateTime: true,
                                        status: true,
                                        admittingDoctorId: true,
                                        admittingDoctor: {
                                            select: {
                                                id: true,
                                                user: {
                                                    select: {
                                                        fName: true,
                                                        lName: true,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                    orderBy: {
                                        admissionDateTime: "desc",
                                    },
                                    take: 1,
                                },
                            },
                        },
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: "desc" },
                }),
                prisma.user.count({ where }),
            ]);
            return apiSuccess(res, {
                data: allPatients,
                message: "All patients fetched successfully.",
                metadata: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: limit,
                    hasNextPage: page < Math.ceil(total / limit),
                    hasPrevPage: page > 1,
                },
            });
        } catch (error) {
            return apiError(res, {
                message: "Failed to fetch patients.",
                error: error,
            });
        }
    },
    async getAppointmentByPatientId(req, res) {
        try {
            const { id } = req.params;
            const query = req.query;
            const search = String(query.search);

            const appointment = await prisma.appointment.findMany({
                where: {
                    patient: {
                        id: id,
                    },
                    status: "COMPLETED",

                    ...(search && {
                        OR: [
                            {
                                doctor: {
                                    user: {
                                        fName: {
                                            contains: search,
                                            mode: "insensitive",
                                        },
                                    },
                                },
                            },
                            {
                                doctor: {
                                    user: {
                                        lName: {
                                            contains: search,
                                            mode: "insensitive",
                                        },
                                    },
                                },
                            },
                        ],
                    }),
                },
                select: {
                    id: true,
                    status: true,
                    reason: true,
                    visits: true,
                    patient: {
                        select: {
                            id: true,
                            gender: true,
                            age: true,
                            user: {
                                select: {
                                    id: true,
                                    fName: true,
                                    lName: true,
                                    bloodGroup: true,
                                    email: true,
                                    phoneNumber: true,
                                },
                            },
                        },
                    },
                    doctor: {
                        select: {
                            user: {
                                select: {
                                    id: true,
                                    fName: true,
                                    lName: true,
                                    email: true,
                                    phoneNumber: true,
                                    employeeInfo: {
                                        select: {
                                            id: true,
                                            experience: true,
                                            department: {
                                                select: {
                                                    name: true,
                                                },
                                            },
                                            qualification: {
                                                select: {
                                                    name: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    referral: {
                        select: {
                            id: true,
                            reason: true,
                            referralName: true,
                            referralContact: true,
                            referralType: true,
                            referralDate: true,
                            concessionPercentage: true,
                            referralUser: {
                                select: {
                                    id: true,
                                    referralName: true,
                                    referralContact: true,
                                    referralType: true,
                                    concessionPercentage: true,
                                    referralEmployee: {
                                        select: {
                                            user: {
                                                select: {
                                                    fName: true,
                                                    lName: true,
                                                    phoneNumber: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    appointmentDate: "desc",
                },
            });

            return apiSuccess(res, {
                data: appointment,
                message: "Appointment fetched successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "failed to fetch appointment",
            });
        }
    },
    async getAdmissionByPatientId(req, res) {
        try {
            const { id } = req.params;
            const query = req.query;
            const search = String(query.search);

            const admission = await prisma.admission.findMany({
                where: {
                    patient: {
                        id: id,
                    },
                    status: "DISCHARGED",

                    ...(search && {
                        OR: [
                            {
                                admittingDoctor: {
                                    user: {
                                        fName: {
                                            contains: search,
                                            mode: "insensitive",
                                        },
                                    },
                                },
                            },
                            {
                                admittingDoctor: {
                                    user: {
                                        lName: {
                                            contains: search,
                                            mode: "insensitive",
                                        },
                                    },
                                },
                            },
                        ],
                    }),
                },
                select: {
                    id: true,
                    status: true,
                    reason: true,
                    sourceVisit: true,
                    patient: {
                        select: {
                            id: true,
                            gender: true,
                            age: true,
                            user: {
                                select: {
                                    id: true,
                                    fName: true,
                                    lName: true,
                                    bloodGroup: true,
                                    email: true,
                                    phoneNumber: true,
                                },
                            },
                        },
                    },
                    admittingDoctor: {
                        select: {
                            user: {
                                select: {
                                    id: true,
                                    fName: true,
                                    lName: true,
                                    email: true,
                                    phoneNumber: true,
                                    employeeInfo: {
                                        select: {
                                            id: true,
                                            experience: true,
                                            department: {
                                                select: {
                                                    name: true,
                                                },
                                            },
                                            qualification: {
                                                select: {
                                                    name: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    reference: {
                        select: {
                            id: true,
                            reason: true,
                            referralName: true,
                            referralContact: true,
                            referralType: true,
                            referralDate: true,
                            concessionPercentage: true,
                            referralUser: {
                                select: {
                                    id: true,
                                    referralName: true,
                                    referralContact: true,
                                    referralType: true,
                                    concessionPercentage: true,
                                    referralEmployee: {
                                        select: {
                                            user: {
                                                select: {
                                                    fName: true,
                                                    lName: true,
                                                    phoneNumber: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    admissionDateTime: "desc",
                },
            });

            return apiSuccess(res, {
                data: admission,
                message: "Admission fetched successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "failed to fetch admission",
            });
        }
    },
    async getBillByAppointmentId(req, res) {
        try {
            const { id } = req.params;
            const bill = await prisma.bill.findFirst({
                where: {
                    items: {
                        some: {
                            referenceId: id,
                        },
                    },
                },
                //review
                select: {
                    id: true,
                    // paymentType: true,
                    // txId: true,
                    externalName: true,
                    externalPhone: true,
                    status: true,
                    // discount: true,
                    createdAt: true,
                    adjustments: true,

                    items: {
                        select: {
                            referenceId: true,
                            id: true,
                            quantity: true,
                            // totalAmount: true,

                            unitPrice: true,
                            // type: true,
                        },
                    },
                },
            });
            return apiSuccess(res, {
                data: bill,
                message: "Bill fetched successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "failed to fetch bill",
            });
        }
    },
    async searchSurgeries(req, res) {
        try {
            const query: {
                search?: string;
            } = req.query;

            const search = query.search?.trim();
            const filters: Prisma.SurgeryWhereInput[] = [];
            if (search) {
                const orConditions: Prisma.SurgeryWhereInput["OR"] = [{ name: { contains: search, mode: "insensitive" } }];
                filters.push({ OR: orConditions });
            }
            const where: Prisma.SurgeryWhereInput = {
                AND: [...filters, { isActive: true }],
            };

            const items = await prisma.surgery.findMany({
                where: where,
                orderBy: { name: "desc" },
            });

            return apiSuccess(res, {
                data: items,
                message: "Surgery names searched successfully",
            });
        } catch (error) {
            console.error("Search surgery error:", error);
            return apiError(res, {
                message: "Failed to search surgeries",
            });
        }
    },
    async addPatientProcedure(req, res) {
        try {
            const {
                surgeryId,
                patientId,
                doctors,
                supportingStaff,
                admissionId,
                surgeryDate,
                status,
                externalDoctor,
                externalDoctorSpeciality,
                diagnosis,
                postOperativeNotes,
                followUpDate,
                hospitalName,
            } = req.body;
            if (!doctors || !patientId || !surgeryId || !admissionId || !surgeryDate) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "surgeryId, patientId,admissionId,doctors and surgeryDate are required",
                });
            }
            const result = await prisma.$transaction(
                async (tx) => {
                    const surgeryProcedure = await tx.patientProcedure.create({
                        data: {
                            patientId: patientId,
                            doctors: {
                                connect: doctors.map((doctorId: string) => ({
                                    id: doctorId,
                                })),
                            },
                            supportingStaff: {
                                connect: supportingStaff.map((staffId: string) => ({
                                    id: staffId,
                                })),
                            },
                            surgeryId: surgeryId,
                            status: status || SurgeryStatus.SCHEDULED,
                            surgeryDate: new Date(surgeryDate) as any,
                            admissionId: admissionId,
                            externalDoctor: externalDoctor || "",
                            externalDoctorSpeciality: externalDoctorSpeciality || "",
                            diagnosis: diagnosis || "",
                            postOperativeNotes: postOperativeNotes || "",
                            followUpDate: followUpDate ? new Date(followUpDate) : null,
                            hospitalName: hospitalName || "",
                        },
                    });
                    const medicalHistory = await tx.medicalHistory.create({
                        data: {
                            admissionId: admissionId,
                            patientId: patientId,
                            patientProcedureId: surgeryProcedure.id,
                        },
                    });

                    // Add to Bill
                    await addItemToBill({
                        patientId,
                        entityId: surgeryId, // We use the master surgeryId for pricing
                        entityType: BillItemType.SURGERY,
                        tx,
                        billType: "IPD",
                        admissionId: admissionId || null,
                    });

                    return surgeryProcedure;
                },
                {
                    maxWait: 60000,
                    timeout: 60000,
                },
            );
            return apiSuccess(res, {
                data: result,
                message: "Surgery procedure added successfully",
            });
        } catch (error) {
            console.error("Error adding surgery procedure", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to add surgery procedure",
            });
        }
    },
    async searchLabTests(req, res) {
        try {
            const query: {
                search?: string;
            } = req.query;

            const search = query.search?.trim();
            const filters: Prisma.LabConfigurationWhereInput[] = [];
            if (search) {
                const orConditions: Prisma.LabConfigurationWhereInput["OR"] = [{ name: { contains: search, mode: "insensitive" } }];
                filters.push({ OR: orConditions });
            }
            const where: Prisma.LabConfigurationWhereInput = {
                AND: [
                    ...filters,
                    {
                        isActive: true,
                    },
                ],
            };

            const items = await prisma.labConfiguration.findMany({
                where: where,
                orderBy: { name: "desc" },
            });

            return apiSuccess(res, {
                data: items,
                message: "Lab tests searched successfully",
            });
        } catch (error) {
            console.error("Search lab tests error:", error);
            return apiError(res, {
                message: "Failed to search lab tests",
            });
        }
    },
    async searchTreatments(req, res) {
        try {
            const query: {
                search?: string;
            } = req.query;

            const search = query.search?.trim();
            const filters: Prisma.TreatmentConfigurationWhereInput[] = [];
            if (search) {
                const orConditions: Prisma.TreatmentConfigurationWhereInput["OR"] = [{ name: { contains: search, mode: "insensitive" } }];
                filters.push({ OR: orConditions });
            }
            const where: Prisma.TreatmentConfigurationWhereInput = {
                AND: [...filters, { isActive: true }],
            };

            const items = await prisma.treatmentConfiguration.findMany({
                where: where,
                orderBy: { name: "desc" },
            });

            return apiSuccess(res, {
                data: items,
                message: "Treatment names searched successfully",
            });
        } catch (error) {
            console.error("Search treatment error:", error);
            return apiError(res, {
                message: "Failed to search treatments",
            });
        }
    },
    async addTreatment(req: any, res: any) {
        try {
            const { treatmentConfigId, patientId, doctorId, admissionId, treatmentDate, status, externalDoctorSpecialty, externalDoctor, diagnosis, additionalNotes, medications } = req.body;
            if (!treatmentConfigId || !doctorId || !patientId || !admissionId || !treatmentDate) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "treatmentConfigId, doctorId, patientId, admissionId and treatmentDate are required",
                });
            }
            const result = await prisma.$transaction(
                async (tx) => {
                    const treatment = await tx.treatment.create({
                        data: {
                            treatmentConfigId: treatmentConfigId as string,
                            patientId: patientId,
                            doctorId: doctorId,
                            status: status || TreatmentStatus.IN_PROGRESS,
                            treatmentDate: new Date(treatmentDate),
                            admissionId: admissionId,
                            externalDoctor: externalDoctor || "",
                            externalDoctorSpecialty: externalDoctorSpecialty || "",
                            diagnosis: diagnosis || "",
                            additionalNotes: additionalNotes || "",
                            medications: medications || "",
                        },
                    });
                    const medicalHistory = await tx.medicalHistory.create({
                        data: {
                            admissionId: admissionId,
                            patientId: patientId,
                            treatmentId: treatment.id,
                        },
                    });

                    // Add to Bill
                    await addItemToBill({
                        patientId,
                        entityId: treatmentConfigId, // We use the master treatmentConfigId for pricing
                        entityType: BillItemType.TREATMENT,
                        tx,
                        billType: "IPD",
                        admissionId: admissionId || null,
                    });

                    return treatment;
                },

                {
                    maxWait: 60000,
                    timeout: 60000,
                },
            );
            return apiSuccess(res, {
                data: result,
                message: "Treatment added successfully",
            });
        } catch (error) {
            console.error("Error adding treatment", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to add treatment",
            });
        }
    },
    async updateTreatment(req: any, res: any) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const existingTreatment = await prisma.treatment.findUnique({
                where: { id },
            });

            if (!existingTreatment) {
                return apiError(res, {
                    statusCode: "NOT_FOUND",
                    message: "Treatment not found",
                });
            }

            if (updateData.treatmentDate) {
                updateData.treatmentDate = new Date(updateData.treatmentDate);
            }

            const treatment = await prisma.treatment.update({
                where: { id },
                data: updateData,
            });

            return apiSuccess(res, {
                data: treatment,
                message: "Treatment updated successfully",
            });
        } catch (error) {
            console.error("Error updating treatment", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to update treatment",
            });
        }
    },
    async updatePatientProcedure(req: any, res: any) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const existingProcedure = await prisma.patientProcedure.findUnique({
                where: { id },
                include: {
                    admission: {
                        select: {
                            bills: true,
                        },
                    },
                },
            });

            if (!existingProcedure) {
                return apiError(res, {
                    statusCode: "NOT_FOUND",
                    message: "Patient Surgery Procedure not found",
                });
            }

            if (updateData.surgeryDate) {
                updateData.surgeryDate = new Date(updateData.surgeryDate);
            }

            const procedure = await prisma.$transaction(async (tx) => {
                if (updateData?.status === "CANCELLED") {
                    const billItemId = await tx.billItem.findFirst({
                        where: {
                            referenceId: existingProcedure.surgeryId,
                            billId: {
                                in: existingProcedure.admission?.bills.map((b) => b.id) || [],
                            },
                        },
                    });
                    console.log("haha", billItemId);

                    if (billItemId) {
                        const deleted = await deleteBillItem(billItemId.id, tx);
                        console.log(deleted);
                    }
                }
                return;
                const procedure = await tx.patientProcedure.update({
                    where: { id },
                    data: updateData,
                });
                return procedure;
            });

            return apiSuccess(res, {
                data: procedure,
                message: "Patient Surgery Procedure updated successfully",
            });
        } catch (error) {
            console.error("Error updating Patient Surgery Procedure", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to update Patient Surgery Procedure",
            });
        }
    },
    async dischargePatient(req, res) {
        try {
            const {
                admissionId,
                patientId,
                doctorId,
                dischargeDate,
                followUpDate,
                followUpDoctorId,
                finalDiagnosis,
                proceduresPerformed,
                medicationsAdministered,
                dietInstructions,
                patientInstructions,
                dischargeSummaryInstructions,
                followUpAdvice,
                billsCleared,
                dischargeSummaryCleared,
                followUpAppointmentScheduled,
                medicalRecordsUpdated,
                roomClearance,
                dischargeFields,
            } = req.body;

            const dischargeId = req.params.id;

            if (!dischargeId) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "Discharge summary ID is required",
                });
            }
            if (!admissionId || !patientId || !doctorId || !finalDiagnosis || !medicationsAdministered) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "admissionId, patientId, doctorId, finalDiagnosis, and medicationsAdministered are required",
                });
            }

            const result = await prisma.$transaction(
                async (tx) => {
                    const existingDischarge = await tx.dischargeSummary.findUnique({
                        where: { id: dischargeId },
                        include: {
                            admission: true,
                            patient: true,
                        },
                    });

                    if (!existingDischarge) {
                        throw new Error("Discharge summary not found");
                    }
                    const patient = await tx.patientInfo.findUnique({
                        where: { id: patientId },
                    });

                    if (!patient) {
                        throw new Error("Patient not found");
                    }

                    const admission = await tx.admission.findUnique({
                        where: { id: admissionId },
                        include: {
                            staySession: {
                                include: {
                                    currentRoomBooking: {
                                        include: {
                                            room: true,
                                        },
                                    },
                                },
                            },
                        },
                    });

                    if (!admission) {
                        throw new Error("Admission not found");
                    }

                    // Update room occupancy and status
                    const roomBooking = admission.staySession?.currentRoomBooking;
                    if (roomBooking && roomBooking.room) {
                        const currentOccupancy = roomBooking.room.currentOccupancy;
                        const newOccupancy = currentOccupancy - 1;
                        const capacity = roomBooking.room.capacity;

                        let newStatus: RoomStatus;
                        if (newOccupancy <= 0) {
                            newStatus = RoomStatus.CLEANING_IN_PROGRESS;
                        } else if (newOccupancy < capacity) {
                            newStatus = RoomStatus.AVAILABLE;
                        } else {
                            newStatus = RoomStatus.OCCUPIED;
                        }
                        await tx.room.update({
                            where: { id: roomBooking.roomId ?? undefined },
                            data: {
                                currentOccupancy: {
                                    decrement: 1,
                                },
                                status: newStatus,
                                // newOccupancy <= 0 ? "CLEANING_IN_PROGRESS" : "OCCUPIED",
                            },
                        });
                    } else if (admission.staySession?.currentRoomBooking?.roomId) {
                        await tx.room.update({
                            where: { id: admission.staySession.currentRoomBooking.roomId },
                            data: { status: "CLEANING_IN_PROGRESS" },
                        });
                    }

                    await tx.admission.update({
                        where: { id: admissionId },
                        data: { status: "DISCHARGED" },
                    });
                    await tx.roomBooking.update({
                        where: { id: admission.staySession?.currentRoomBooking?.id },
                        data: { status: "COMPLETED" },
                    });
                    await tx.inpatientStaySession.update({
                        where: { id: admission.staySession?.id },
                        data: { status: "DISCHARGED" },
                    });
                    const newPrescription = await tx.prescription.create({
                        data: {
                            doctorId: String(doctorId),
                            patientId,
                            visitId: null,
                            notes: null,
                            prescriptionItems: {
                                create: medicationsAdministered.map((item: any) => ({
                                    itemId: item.itemId,
                                    dosage: item.dosage,
                                    frequency: item.frequency,
                                    duration: item.duration,
                                    timing: item.timing,
                                })),
                            },
                        },
                        select: {
                            id: true,
                            doctorId: true,
                            patientId: true,
                            visitId: true,
                            notes: true,
                            _count: {
                                select: {
                                    prescriptionItems: true,
                                },
                            },
                            prescriptionItems: {
                                select: {
                                    id: true,
                                    itemId: true,
                                    dosage: true,
                                    frequency: true,
                                    duration: true,
                                },
                            },
                        },
                    });
                    const updatedDischargeSummary = await tx.dischargeSummary.update({
                        where: { id: dischargeId },
                        data: {
                            patientId,
                            doctorId,
                            dischargeDate: dischargeDate ? new Date(dischargeDate) : existingDischarge.dischargeDate,
                            followUpDate: followUpDate ? new Date(followUpDate) : existingDischarge.followUpDate,
                            followUpDoctorId: followUpDoctorId || existingDischarge.followUpDoctorId,
                            finalDiagnosis,
                            proceduresPerformed,
                            medicationsAdministered,
                            dietInstructions,
                            dischargeSummaryInstructions,
                            patientInstructions,
                            followUpAdvice,
                            billsCleared: billsCleared,
                            dischargeSummaryCleared: dischargeSummaryCleared,
                            followUpAppointmentScheduled: followUpAppointmentScheduled,
                            medicalRecordsUpdated: medicalRecordsUpdated,
                            roomClearance: roomClearance,
                            approvedByDoctor: true,
                            dischargeFields: dischargeFields?.map((field: { id: string; title: string; description: string }) => ({ ...field, id: cuid() })),
                        },
                        include: {
                            patient: true,
                            doctor: true,
                            admission: true,
                        },
                    });
                    const medicalHistory = await tx.medicalHistory.create({
                        data: {
                            admissionId: admissionId,
                            patientId: patientId,
                            dischargeSummaryId: updatedDischargeSummary.id,
                        },
                    });
                    return updatedDischargeSummary;
                },
                {
                    maxWait: 60000,
                    timeout: 60000,
                },
            );

            // ── Discharge Follow-Up Log ──
            try {
                const dischargeSummary = await prisma.dischargeSummary.findUnique({
                    where: { admissionId: admissionId },
                    include: {
                        patient: {
                            include: {
                                user: {
                                    select: { fName: true, lName: true, phoneNumber: true },
                                },
                            },
                        },
                        followUpDoctor: {
                            include: {
                                user: {
                                    select: { fName: true, lName: true, phoneNumber: true },
                                },
                            },
                        },
                        doctor: {
                            include: {
                                user: {
                                    select: { fName: true, lName: true, phoneNumber: true },
                                },
                            },
                        },
                    },
                });

                if (dischargeSummary?.followUpDate) {
                    const patientUser = dischargeSummary.patient?.user;
                    const patientName = patientUser ? `${patientUser.fName} ${patientUser.lName}`.trim() : "Patient";

                    const doctorRecord = dischargeSummary.followUpDoctor ?? dischargeSummary.doctor;
                    const doctorName = doctorRecord?.user ? `${doctorRecord.user.fName} ${doctorRecord.user.lName}`.trim() : "Doctor";

                    const followUpDate = formatDate(new Date(dischargeSummary.followUpDate));

                    console.log(`[FollowUp] ${patientName} has a follow-up on ${followUpDate} with Dr. ${doctorName}. Reminder will fire 1 day before via reminder.worker.ts`);
                }
            } catch (notifError) {
                console.error("[Notification] Discharge follow-up log failed:", notifError);
            }
            // ── End Discharge Follow-Up Log ──

            return apiSuccess(res, {
                data: result,
                message: "Patient discharged successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to discharge patient",
            });
        }
    },
    async getBillSummary(req: Request, res: Response) {
        try {
            const { admissionId } = req.params;

            if (!admissionId) {
                return res.status(400).json({
                    success: false,
                    message: "admissionId is required",
                });
            }

            // 1. Get admission details with patient info
            const admission = await prisma.admission.findUnique({
                where: {
                    id: admissionId,
                    status: { not: "CANCELLED" },
                },
                include: {
                    patient: {
                        include: {
                            user: {
                                select: {
                                    fName: true,
                                    lName: true,
                                    phoneNumber: true,
                                    email: true,
                                },
                            },
                        },
                    },
                    staySession: {
                        include: {
                            currentRoomBooking: {
                                include: {
                                    room: {
                                        include: {
                                            roomType: true,
                                            floor: {
                                                include: {
                                                    building: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                            transfers: {
                                include: {
                                    fromRoom: {
                                        include: {
                                            roomType: true,
                                            floor: {
                                                include: {
                                                    building: true,
                                                },
                                            },
                                        },
                                    },
                                    toRoom: {
                                        include: {
                                            roomType: true,
                                            floor: {
                                                include: {
                                                    building: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    dischargeSummary: true,
                    reference: true,
                    admittingDoctor: {
                        include: {
                            user: {
                                select: {
                                    fName: true,
                                    lName: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!admission) {
                return res.status(404).json({
                    success: false,
                    message: "Admission not found",
                });
            }
            const patientId = admission.patientId;
            const depositAmount = admission.amount ? parseFloat(admission.amount) : 0;
            const concessionPercentage = admission.reference?.concessionPercentage || 0;
            // 2. Get doctor consultations within this admission period
            const visits = await prisma.visit.findMany({
                where: {
                    patientId: patientId,
                    visitDate: {
                        gte: admission.admissionDateTime,
                        ...(admission.actualDischarge ? { lte: admission.actualDischarge } : {}),
                    },
                },
                include: {
                    doctor: {
                        select: {
                            user: {
                                select: {
                                    fName: true,
                                    lName: true,
                                },
                            },
                        },
                    },
                },
            });

            const visitCharges = await Promise.all(
                visits.map(async (visit) => ({
                    id: visit.id,
                    name: `Consulation - Dr.${visit.doctor?.user?.fName || ""} ${visit.doctor?.user?.lName || ""}`,
                    amount: await getActivePriceAmount(PriceEntityType.DOCTOR_CONSULTATION, visit.doctorId),
                    date: visit.visitDate,
                    type: "visit",
                })),
            );

            // 3. Get lab tests within admission period
            const labOrders = await prisma.labOrder.findMany({
                where: {
                    patientId: patientId,
                    orderDate: {
                        gte: admission.admissionDateTime,
                        ...(admission.actualDischarge ? { lte: admission.actualDischarge } : {}),
                    },
                },
                include: {
                    testIds: true,
                },
            });

            const labCharges: any[] = [];
            for (const order of labOrders) {
                for (const test of order.testIds) {
                    const price = await getActivePriceAmount(PriceEntityType.LAB, test.id);
                    labCharges.push({
                        id: order.id,
                        name: test.name,
                        amount: price,
                        date: order.orderDate,
                        type: "lab",
                        testId: test.id,
                    });
                }
            }

            // 4. Get surgeries within admission period
            const surgeries = await prisma.patientProcedure.findMany({
                where: {
                    patientId: patientId,
                    status: {
                        not: "CANCELLED",
                    },
                    surgeryDate: {
                        gte: admission.admissionDateTime,
                        ...(admission.actualDischarge ? { lte: admission.actualDischarge } : {}),
                    },
                },
                include: {
                    surgery: true,
                },
            });

            const surgeryCharges = await Promise.all(
                surgeries.map(async (proc) => ({
                    id: proc.id,
                    name: proc.surgery?.name || "Surgery",
                    amount: await getActivePriceAmount(PriceEntityType.SURGERY, proc.surgeryId),
                    date: proc.surgeryDate,
                    type: "surgery",
                })),
            );
            // 5. Get treatments within admission period
            const treatments = await prisma.treatment.findMany({
                where: {
                    patientId: patientId,
                    status: {
                        not: "CANCELLED",
                    },
                },
                include: {
                    treatmentConfiguration: true,
                    doctor: {
                        select: {
                            user: {
                                select: {
                                    fName: true,
                                    lName: true,
                                },
                            },
                        },
                    },
                },
            });

            const treatmentCharges = await Promise.all(
                treatments.map(async (t) => ({
                    id: t.id,
                    name: t.treatmentConfiguration?.name || "Treatment",
                    doctorName: `Consulation - Dr.${t.doctor?.user?.fName || ""} ${t.doctor?.user?.lName || ""}`,
                    amount: await getActivePriceAmount(PriceEntityType.TREATMENT, t.id),
                    date: t.treatmentDate,
                    type: "treatment",
                })),
            );
            //6. Get room charges within admission period
            const roomCharges: any[] = [];
            const staySession = admission.staySession;

            if (staySession) {
                const admissionDate = new Date(admission.admissionDateTime);

                // Get discharge date
                let dischargeDate: Date | null = null;
                if (admission.dischargeSummary?.dischargeDate) {
                    dischargeDate = new Date(admission.dischargeSummary.dischargeDate);
                } else if (admission.actualDischarge) {
                    dischargeDate = new Date(admission.actualDischarge);
                }

                // If no discharge date, use current date
                const endDate = dischargeDate && dischargeDate > admissionDate ? dischargeDate : new Date();

                // Build room history from transfers
                const roomHistory: Array<{
                    room: any;
                    startDate: Date;
                    endDate: Date;
                    dailyRate: number;
                }> = [];

                // Get the initial room (from admission, before any transfers)
                // We need to get the first room from the first transfer's fromRoom or from the currentRoomBooking's history
                let initialRoom = null;
                let initialDailyRate = 0;

                // Sort transfers by effective date
                const sortedTransfers =
                    staySession.transfers && staySession.transfers.length > 0
                        ? [...staySession.transfers].sort((a, b) => new Date(a.effectiveFrom).getTime() - new Date(b.effectiveFrom).getTime())
                        : [];

                if (sortedTransfers.length > 0) {
                    // Get the first room from the first transfer's fromRoom
                    const firstTransfer = sortedTransfers[0];
                    if (firstTransfer.fromRoom) {
                        initialRoom = firstTransfer.fromRoom;
                        initialDailyRate = await getActivePriceAmount(PriceEntityType.ROOM_TYPE, firstTransfer.fromRoom.roomTypeId);
                    }
                }

                // If no transfers or no fromRoom in first transfer, use currentRoomBooking (but this might be the latest room)
                // Actually, we need to find the original admission room from the first room booking
                // For now, if we have transfers, the first transfer's fromRoom is the initial room

                if (initialRoom) {
                    // Add initial room period from admission to first transfer
                    const firstTransferDate = new Date(sortedTransfers[0].effectiveFrom);
                    if (firstTransferDate > admissionDate) {
                        const initialDays = Math.max(1, Math.ceil((firstTransferDate.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24)));
                        if (initialDays > 0) {
                            roomHistory.push({
                                room: initialRoom,
                                startDate: admissionDate,
                                endDate: firstTransferDate,
                                dailyRate: initialDailyRate,
                            });
                        }
                    }

                    // Process each transfer period
                    for (let i = 0; i < sortedTransfers.length; i++) {
                        const transfer = sortedTransfers[i];
                        const transferStartDate = new Date(transfer.effectiveFrom);

                        // Determine the end date for this room
                        let transferEndDate = endDate;
                        if (i + 1 < sortedTransfers.length) {
                            const nextTransferDate = new Date(sortedTransfers[i + 1].effectiveFrom);
                            transferEndDate = nextTransferDate;
                        } else {
                            transferEndDate = endDate;
                        }

                        // Add the room from this transfer's toRoom
                        if (transfer.toRoom && transferStartDate < transferEndDate) {
                            const days = Math.max(1, Math.ceil((transferEndDate.getTime() - transferStartDate.getTime()) / (1000 * 60 * 60 * 24)));
                            if (days > 0) {
                                roomHistory.push({
                                    room: transfer.toRoom,
                                    startDate: transferStartDate,
                                    endDate: transferEndDate,
                                    dailyRate: await getActivePriceAmount(PriceEntityType.ROOM_TYPE, transfer.toRoom.roomTypeId),
                                });
                            }
                        }
                    }
                } else {
                    // No transfers, just use the current room booking for the entire duration
                    const currentRoom = staySession.currentRoomBooking?.room;
                    if (currentRoom) {
                        const dailyRate =
                            staySession.currentRoomBooking?.roomCharges !== 0 && staySession.currentRoomBooking?.roomCharges
                                ? staySession.currentRoomBooking.roomCharges
                                : await getActivePriceAmount(PriceEntityType.ROOM_TYPE, currentRoom.roomTypeId);

                        const days = Math.max(1, Math.ceil((endDate.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24)));
                        if (days > 0) {
                            roomHistory.push({
                                room: currentRoom,
                                startDate: admissionDate,
                                endDate: endDate,
                                dailyRate: dailyRate,
                            });
                        }
                    }
                }

                // Calculate total charges and create breakdown
                let totalRoomCharge = 0;
                const roomBreakdown: any[] = [];

                for (const period of roomHistory) {
                    const days = Math.max(1, Math.ceil((period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24)));
                    const charge = period.dailyRate * days;
                    totalRoomCharge += charge;

                    roomBreakdown.push({
                        name: period.room.roomType?.name || "Unknown",
                        roomNumber: period.room.roomNumber || "N/A",
                        floor: period.room.floor?.name || "N/A",
                        building: period.room.floor?.building?.name || "N/A",
                        dailyRate: period.dailyRate,
                        days: days,
                        startDate: period.startDate,
                        endDate: period.endDate,
                        amount: charge,
                    });
                }

                // Create charge entry
                if (roomBreakdown.length > 0) {
                    const uniqueRooms = new Set(roomBreakdown.map((b) => `${b.name}_${b.roomNumber}`));
                    const isMultipleRooms = uniqueRooms.size > 1;
                    const latestRoom = roomBreakdown[roomBreakdown.length - 1];
                    roomCharges.push({
                        name: isMultipleRooms ? latestRoom.name : roomBreakdown[0].name,
                        roomNumber: isMultipleRooms ? latestRoom.roomNumber : roomBreakdown[0].roomNumber,
                        floor: isMultipleRooms ? latestRoom.floor : roomBreakdown[0].floor,
                        building: isMultipleRooms ? latestRoom.building : roomBreakdown[0].building,
                        amount: isMultipleRooms ? latestRoom.amount : roomBreakdown[0].amount,
                        totalAmount: totalRoomCharge,
                        transferCharges: 0,
                        date: admissionDate,
                        type: "room",
                        details: {
                            admissionDate: admissionDate,
                            dischargeDate: dischargeDate,
                            totalDays: Math.max(1, Math.ceil((endDate.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24))),
                            isDischarged: !!dischargeDate,
                            transfers: sortedTransfers.length,
                            roomBreakdown: roomBreakdown,
                        },
                    });
                }
            }
            // 7. Get pharmacy bills within admission period (only for inpatient stay duration)
            let dischargeDateForFilter: Date | null = null;

            if (admission.status === "DISCHARGED") {
                if (admission.dischargeSummary?.dischargeDate) {
                    dischargeDateForFilter = new Date(admission.dischargeSummary.dischargeDate);
                } else if (admission.actualDischarge) {
                    dischargeDateForFilter = new Date(admission.actualDischarge);
                }
            }

            // 7. Get items and adjustments from the new billing system
            const bills = await prisma.bill.findMany({
                where: {
                    patientId: patientId,
                    status: { not: "CANCELLED" },
                },
                include: {
                    items: {
                        where: { status: "ACTIVE" },
                        include: { billAdjustments: { where: { active: true } } },
                    },
                    adjustments: { where: { active: true } },
                },
            });

            const newSystemCharges: any[] = [];
            const allBillAdjustments: any[] = [];
            let activeBillId: string | null = null;

            for (const bill of bills) {
                if (!activeBillId && bill.status !== "PAID") {
                    activeBillId = bill.id;
                }

                // Add bill-level adjustments
                for (const adj of bill.adjustments) {
                    allBillAdjustments.push(adj);
                }

                for (const item of bill.items) {
                    newSystemCharges.push({
                        id: item.id,
                        name: item.title,
                        amount: item.unitPrice * item.quantity,
                        unitPrice: item.unitPrice,
                        quantity: item.quantity,
                        date: item.createdAt,
                        type: item.referenceType.toLowerCase(),
                        isBillItem: true,
                        adjustments: item.billAdjustments,
                    });

                    // Add item-level adjustments
                    for (const adj of item.billAdjustments) {
                        allBillAdjustments.push(adj);
                    }
                }
            }

            // 8. Get diet charges within admission period
            const diets = await prisma.patientMeal.findMany({
                where: {
                    patientId: patientId,
                    createdAt: {
                        gte: admission.admissionDateTime,
                        ...(admission.actualDischarge ? { lte: admission.actualDischarge } : {}),
                    },
                },
                include: {
                    patientMealFoodItems: {
                        include: {
                            foodItem: true,
                        },
                    },
                },
            });
            const dietCharges = await Promise.all(
                diets.map(async (diet) => {
                    const totalAmount = await diet.patientMealFoodItems.reduce(async (sumPromise, item) => {
                        const sum = await sumPromise;
                        const price = await getActivePriceAmount(PriceEntityType.FOOD, item.foodItemId);
                        return sum + price;
                    }, Promise.resolve(0));
                    return {
                        id: diet.id,
                        name: `${diet.patientMealFoodItems.map((item) => item.foodItem.name).join(", ")}`,
                        amount: totalAmount,
                        date: diet.createdAt,
                        type: "diet",
                    };
                }),
            );

            // 9. Get physio sessions within admission period
            const physioSessions = await prisma.physioTherapy.findMany({
                where: {
                    patientId: patientId,
                    sessionDate: {
                        gte: admission.admissionDateTime,
                        ...(admission.actualDischarge ? { lte: admission.actualDischarge } : {}),
                    },
                },
            });

            const physioCharges = await Promise.all(
                physioSessions.map(async (session) => ({
                    id: session.id,
                    name: `Physiotherapy`,
                    amount: await getActivePriceAmount(PriceEntityType.PHYSIOTHERAPY, session.id),
                    date: session.sessionDate,
                    type: "physio",
                })),
            );

            // 10. Get all payments made for this admission
            const payments = await prisma.paymentDetails.findMany({
                where: {
                    admissionId: admissionId,
                    paymentStatus: {
                        not: "CANCELLED", // Exclude cancelled payments
                    },
                },
                orderBy: {
                    paymentDate: "desc",
                },
            });

            // Calculate total paid amount from payments
            let totalPaidAmount = 0;
            for (const payment of payments) {
                totalPaidAmount += parseFloat(payment?.amount || "0");
            }

            // Combine all charges
            // Filter out old system charges if they are already represented in newSystemCharges (by referenceId)
            const oldSystemCharges = [...visitCharges, ...labCharges, ...surgeryCharges, ...roomCharges, ...dietCharges, ...physioCharges, ...treatmentCharges];

            const allCharges = [...newSystemCharges, ...oldSystemCharges].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            // Calculate totals
            const totalCharges = allCharges.reduce((sum, charge) => sum + charge.amount, 0);

            // Calculate total from adjustments
            const adjustmentsTotal = allBillAdjustments.reduce((sum, adj) => {
                let val = 0;
                if (adj.mode === "PERCENTAGE") {
                    val = (totalCharges * adj.value) / 100;
                } else {
                    val = adj.value;
                }
                return adj.type === "EXTRA_CHARGE" ? sum - val : sum + val;
            }, 0);

            const concessionAmount = (totalCharges * concessionPercentage) / 100;
            const totalAfterConcession = totalCharges - concessionAmount - (adjustmentsTotal > 0 ? adjustmentsTotal : 0);

            // Calculate total discount from payments
            let totalDiscountFromPayments = 0;
            for (const payment of payments) {
                if (payment.discount && payment.discountType) {
                    const discountValue = parseFloat(payment.discount);
                    if (payment.discountType.toUpperCase() === "PERCENTAGE") {
                        totalDiscountFromPayments += (totalCharges * discountValue) / 100;
                    } else if (payment.discountType.toUpperCase() === "FIXED") {
                        totalDiscountFromPayments += discountValue;
                    }
                }
            }

            // Calculate effective paid amount
            const effectivePaidAmount = totalPaidAmount + totalDiscountFromPayments;

            // Calculate balance
            const balanceAmount = totalAfterConcession - depositAmount - effectivePaidAmount;
            const payableAmount = Math.max(0, balanceAmount);

            // Calculate if bill is fully paid
            const isFullyPaid = payableAmount <= 0;
            const paymentStatus = isFullyPaid ? "PAID" : totalPaidAmount > 0 ? "PARTIALLY_PAID" : "PENDING";

            // Group by type for summary
            const summary = allCharges.reduce(
                (acc, charge) => {
                    acc[charge.type] = (acc[charge.type] || 0) + charge.amount;
                    return acc;
                },
                {} as Record<string, number>,
            );

            // Group payments by method for summary
            const paymentSummary = payments.reduce(
                (acc, payment) => {
                    const method = (payment.paymentType || "OTHER") as string;
                    acc[method] = (acc[method] || 0) + parseFloat(payment?.amount || "0");
                    return acc;
                },
                {} as Record<string, number>,
            );

            // Group discount summary
            const discountSummary = payments.reduce(
                (acc, payment) => {
                    if (payment.discount && payment.discountType) {
                        const discountValue = parseFloat(payment.discount);
                        let discountAmt = 0;
                        if (payment.discountType.toUpperCase() === "PERCENTAGE") {
                            discountAmt = (totalCharges * discountValue) / 100;
                            acc.totalPercentageDiscount += discountAmt;
                            acc.percentageDiscounts.push({
                                paymentId: payment.id,
                                percentage: discountValue,
                                amount: discountAmt,
                                appliedOn: totalCharges,
                            });
                        } else if (payment.discountType.toUpperCase() === "FIXED") {
                            discountAmt = discountValue;
                            acc.totalFixedDiscount += discountAmt;
                            acc.fixedDiscounts.push({
                                paymentId: payment.id,
                                amount: discountValue,
                            });
                        }
                        acc.totalDiscount += discountAmt;
                    }
                    return acc;
                },
                {
                    totalDiscount: 0,
                    totalFixedDiscount: 0,
                    totalPercentageDiscount: 0,
                    fixedDiscounts: [] as Array<{ paymentId: string; amount: number }>,
                    percentageDiscounts: [] as Array<{
                        paymentId: string;
                        percentage: number;
                        amount: number;
                        appliedOn: number;
                    }>,
                },
            );

            // Prepare final response
            const responseBody = {
                success: true,
                data: {
                    billId: activeBillId,
                    admission: {
                        id: admission.id,
                        admissionDate: admission.admissionDateTime,
                        dischargeDate: admission.dischargeSummary?.dischargeDate,
                        status: admission.status,
                        reason: admission.reason,
                        admittingDoctor: admission.admittingDoctor?.user?.fName ? `${admission.admittingDoctor.user.fName} ${admission.admittingDoctor.user.lName}` : null,
                        depositAmount: depositAmount,
                    },
                    patient: {
                        id: admission.patient.id,
                        name: `${admission.patient.user?.fName || ""} ${admission.patient.user?.lName || ""}`.trim(),
                        phone: admission.patient.user?.phoneNumber,
                        email: admission.patient.user?.email,
                        age: admission.patient.age,
                        gender: admission.patient.gender,
                    },
                    billDetails: {
                        charges: allCharges,
                        adjustments: allBillAdjustments,
                        summary: {
                            visit: summary.visit || 0,
                            lab: summary.lab || 0,
                            surgery: summary.surgery || 0,
                            room: summary.room || 0,
                            pharmacy: summary.pharmacy || 0,
                            diet: summary.diet || 0,
                            physio: summary.physio || 0,
                            treatment: summary.treatment || 0,
                        },
                        totals: {
                            totalCharges: totalCharges,
                            concessionPercentage: concessionPercentage,
                            concessionAmount: concessionAmount,
                            adjustmentsTotal: adjustmentsTotal,
                            totalAfterConcession: totalAfterConcession,
                            depositAmount: depositAmount,
                            totalPaidAmount: totalPaidAmount,
                            totalDiscountAmount: totalDiscountFromPayments,
                            effectivePaidAmount: effectivePaidAmount,
                            balanceAmount: balanceAmount,
                            payableAmount: payableAmount,
                            paymentStatus: paymentStatus,
                            isFullyPaid: isFullyPaid,
                        },
                        payments: {
                            history: payments.map((payment) => ({
                                id: payment.id,
                                amount: payment?.amount,
                                paymentType: payment.paymentType,
                                paymentStatus: payment.paymentStatus,
                                discount: payment.discount,
                                discountType: payment.discountType,
                                txnId: payment.txnId,
                                receiptNumber: payment.receiptNumber,
                                paymentDate: payment.paymentDate,
                                notes: payment.notes,
                            })),
                            summary: paymentSummary,
                            discountSummary: discountSummary,
                            totalCount: payments.length,
                            totalAmount: totalPaidAmount,
                        },
                    },
                },
            };

            return res.json(responseBody);
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Error fetching bill summary",
            });
        }
    },

    async processPayment(req, res) {
        try {
            const { patientId, admissionId, paymentType, discount, discountType, paymentStatus, amount, txnId, notes, paymentDate } = req.body;

            // Validation
            if (!patientId || !admissionId || !amount) {
                return apiError(res, {
                    message: "Missing required fields: patientId, admissionId, amount",
                });
            }

            // Validate amount
            if (isNaN(parseFloat(amount))) {
                return apiError(res, {
                    message: "Amount must be a valid number",
                });
            }

            // Check if patient exists
            const patient = await prisma.patientInfo.findUnique({
                where: { id: patientId },
            });

            if (!patient) {
                return apiError(res, {
                    message: "Patient not found",
                });
            }

            // Check if admission exists
            const admission = await prisma.admission.findUnique({
                where: { id: admissionId },
            });

            if (!admission) {
                return apiError(res, {
                    message: "Admission not found",
                });
            }

            // Generate receipt number automatically
            const receiptNumber = await generateReceiptNumber();

            // Optional: Check for duplicate transaction ID if provided
            if (txnId) {
                const existingTxn = await prisma.paymentDetails.findUnique({
                    where: { txnId },
                });

                if (existingTxn) {
                    return apiError(res, {
                        message: "Transaction ID already exists",
                    });
                }
            }

            // Create payment with auto-generated receipt number
            const payment = await prisma.paymentDetails.create({
                data: {
                    patientId,
                    admissionId,
                    paymentType: paymentType || "OTHER",
                    paymentStatus: paymentStatus || "PENDING",
                    amount,
                    discount: discount || "0",
                    discountType: discountType || "PERCENTAGE",
                    txnId,
                    notes,
                    receiptNumber, // Auto-generated
                    paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
                },
                include: {
                    patient: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    fName: true,
                                    lName: true,
                                    phoneNumber: true,
                                    email: true,
                                },
                            },
                        },
                    },
                    admission: true,
                },
            });

            return apiSuccess(res, {
                data: payment,
                message: "Payment created successfully",
            });
        } catch (error) {
            console.error("Error creating payment:", error);
            return apiError(res, {
                error: "Internal server error",
                status: 500,
            });
        }
    },
    async getPatientPaymentDetails(req, res) {
        try {
            const admissionId = req.params.admissionId as string;
            const payments = await prisma.paymentDetails.findMany({
                where: {
                    admissionId,
                },
                include: {
                    patient: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    fName: true,
                                    lName: true,
                                    phoneNumber: true,
                                    email: true,
                                },
                            },
                        },
                    },
                },
            });
            return apiSuccess(res, {
                data: payments,
                message: "Payment details fetched successfully",
            });
        } catch (error) {
            return apiError(res, {
                message: "Failed to fetch patient payment details",
            });
        }
    },
    async getReferralUsers(req: Request, res: Response) {
        try {
            const { referralType, name } = req.query;
            const referralTypeValue = referralType ? (referralType as string).toUpperCase() : "NONE";

            // Validate if the referralType is valid enum value
            const validReferralTypes = ["INTERNAL", "EXTERNAL", "NONE"];
            if (!validReferralTypes.includes(referralTypeValue)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid referralType. Must be INTERNAL, EXTERNAL, or NONE",
                });
            }
            let where: any = {
                referralType: referralTypeValue as any,
            };
            if (name && referralTypeValue !== "NONE") {
                const searchTerms = String(name).trim().split(/\s+/);

                if (referralTypeValue === "INTERNAL") {
                    const termConditions = searchTerms.map((term) => ({
                        OR: [{ fName: { contains: term, mode: "insensitive" } }, { lName: { contains: term, mode: "insensitive" } }],
                    }));
                    where = {
                        ...where,
                        referralEmployee: {
                            user: {
                                AND: termConditions,
                            },
                        },
                    };
                } else if (referralTypeValue === "EXTERNAL") {
                    const termConditions = searchTerms.map((term) => ({
                        referralName: { contains: term, mode: "insensitive" },
                    }));
                    where = {
                        ...where,
                        AND: termConditions,
                    };
                }
            }
            const referralUsers = await prisma.referralUsers.findMany({
                where: where,
                include: {
                    referralEmployee: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    fName: true,
                                    lName: true,
                                    phoneNumber: true,
                                    email: true,
                                },
                            },
                        },
                    },
                },
            });
            return res.json({
                success: true,
                data: referralUsers,
                metaData: {
                    referralType: referralTypeValue,
                    totalCount: referralUsers.length,
                },
            });
        } catch (error) {
            console.error("Error in getReferralUsers:", error);
            return res.status(500).json({
                success: false,
                message: "Error fetching referral users",
            });
        }
    },

    async getPaymentDetailsById(req, res) {
        try {
            const paymentId = req.params.paymentId as string;
            const payment = await prisma.paymentDetails.findUnique({
                where: {
                    id: paymentId,
                },
                include: {
                    patient: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    fName: true,
                                    lName: true,
                                    phoneNumber: true,
                                    email: true,
                                },
                            },
                        },
                    },
                },
            });
            return apiSuccess(res, {
                data: payment,
            });
        } catch (error) {
            return apiError(res, {
                message: "Failed to fetch patient payment details",
            });
        }
    },
    async addPatientMeal(req, res) {
        try {
            const { patientId, admissionId, mealTime, foodItems, specialNotes } = req.body;

            if (!patientId || !mealTime) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "Missing required fields: patientId, mealTime",
                });
            }

            const patient = await prisma.patientInfo.findUnique({
                where: { id: patientId },
            });

            if (!patient) {
                return apiError(res, {
                    message: "Patient not found",
                });
            }

            const result = await prisma.$transaction(async (tx) => {
                const meal = await tx.patientMeal.create({
                    data: {
                        patientId,
                        admissionId: admissionId || null,
                        mealTime: new Date(mealTime),
                        specialNotes: specialNotes || null,
                        patientMealFoodItems: {
                            create: foodItems.map((item: any) => ({
                                foodItemId: item.foodItemId,
                                quantity: item.quantity || 1,
                            })),
                        },
                    },
                    include: {
                        patientMealFoodItems: {
                            include: {
                                foodItem: true,
                            },
                        },
                    },
                });

                // Add each food item to the Bill
                for (const item of foodItems) {
                    await addItemToBill({
                        patientId,
                        entityId: item.foodItemId,
                        entityType: BillItemType.FOOD,
                        quantity: item.quantity || 1,
                        tx,
                        billType: "IPD",
                        admissionId: admissionId || null,
                    });
                }

                return meal;
            });
            return apiSuccess(res, {
                data: result,
                message: "Patient meal added successfully",
            });
        } catch (error) {
            console.error("Error:", error);
            return apiError(res, {
                message: "Failed to add patient meal",
            });
        }
    },
    async searchFoodItems(req, res) {
        try {
            const search = (req.query.search as string) || "";
            const type = (req.query.type as string) || "";

            let whereCondition: any = {
                isDisabled: false,
            };

            if (search) {
                whereCondition = {
                    ...whereCondition,
                    name: {
                        contains: search,
                        mode: "insensitive",
                    },
                };
            }

            if (type) {
                whereCondition = {
                    ...whereCondition,
                    type: type.toUpperCase(),
                };
            }

            const foodItems = await prisma.foodItems.findMany({
                where: whereCondition,
                orderBy: {
                    name: "asc",
                },
            });
            // Enrich each item with its active price
            const enriched = await Promise.all(
                foodItems.map(async (item) => {
                    const price = await getActivePriceAmount(PriceEntityType.FOOD, item.id);
                    return {
                        ...item,
                        price,
                    };
                }),
            );
            return apiSuccess(res, {
                data: enriched,
                message: "Food items fetched successfully",
            });
        } catch (error) {
            console.error("Error:", error);
            return apiError(res, {
                message: "Failed to fetch food items",
            });
        }
    },
    async getDoctorsByPatientId(req, res) {
        try {
            const patientId = req.params.id as string;
            const patient = await prisma.patientInfo.findUnique({
                where: {
                    id: patientId,
                },
            });
            if (!patient) {
                return apiError(res, {
                    message: "Patient not found.",
                });
            }
            const doctors = await prisma.employeeInfo.findMany({
                select: {
                    id: true,
                    user: {
                        select: {
                            id: true,
                            fName: true,
                            lName: true,
                        },
                    },
                    department: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                where: {
                    user: {
                        isDoctor: true,
                    },
                    OR: [
                        {
                            appointments: {
                                some: {
                                    patientId: patientId,
                                },
                            },
                        },
                        {
                            prescribedBy: {
                                some: {
                                    patientId: patientId,
                                },
                            },
                        },
                        {
                            doctorDischargeSummaries: {
                                some: {
                                    patientId: patientId,
                                },
                            },
                        },
                        {
                            admissions: {
                                some: {
                                    patientId: patientId,
                                },
                            },
                        },
                        {
                            labOrders: {
                                some: {
                                    patientId: patientId,
                                },
                            },
                        },
                        {
                            vital: {
                                some: {
                                    patientId: patientId,
                                },
                            },
                        },
                        {
                            doctors: {
                                some: {
                                    patientId: patientId,
                                },
                            },
                        },
                        {
                            treatments: {
                                some: {
                                    patientId: patientId,
                                },
                            },
                        },
                        {
                            visitsTo: {
                                some: {
                                    patientId: patientId,
                                },
                            },
                        },
                        {
                            followUpDoctor: {
                                some: {
                                    patientId: patientId,
                                },
                            },
                        },
                    ],
                },
            });
            return apiSuccess(res, {
                data: doctors,
                message: "Doctors fetched successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to retrieve doctors",
            });
        }
    },
    async makeOutPatientToInPatient(req, res) {
        try {
            const body: MakeOutPatientToInPatient = req.body;
            const appointmentId = req.params.id as string;
            if (!appointmentId) {
                return apiError(res, {
                    message: "Appointment ID is required.",
                });
            }
            const appointment = await prisma.appointment.findUnique({
                where: {
                    id: appointmentId,
                },
                include: {
                    doctor: true,
                    patient: {
                        include: { user: true },
                    },
                    referral: true,
                },
            });

            if (!appointment) {
                return apiError(res, {
                    message: "Appointment not found.",
                });
            }

            const room = await prisma.room.findUnique({
                where: { id: body.roomId },
            });
            if (!room) {
                return apiError(res, { message: "Room not found" });
            }
            if (room.status !== RoomStatus.AVAILABLE) {
                return apiError(res, { message: "Room is not available" });
            }
            const doctor = await prisma.user.findFirst({
                where: {
                    OR: [{ id: body.doctorId }, { employeeInfo: { id: body.doctorId } }],
                },
                include: {
                    employeeInfo: true,
                },
            });
            const transaction = await prisma.$transaction(async (tx) => {
                const updateAppointment = await tx.appointment.update({
                    where: {
                        id: appointmentId,
                    },
                    data: {
                        status: "COMPLETED",
                    },
                });

                const updatePatientInfo = await tx.patientInfo.update({
                    where: {
                        id: appointment.patientId!,
                    },
                    data: {
                        insuranceProvider: body.insuranceInfo?.insuranceProvider,
                        policyNumber: body.insuranceInfo?.policyNumber,
                        policyHolderName: body.insuranceInfo?.policyHolderName,
                        policyExpiryDate: body.insuranceInfo?.policyExpiryDate,
                        tpaName: body.insuranceInfo?.tpaName,
                        emergencyContactName: body.emergencyContact?.name,
                        emergencyContact: body.emergencyContact?.contact,
                        emergencyContactNotes: body.emergencyContact?.notes,
                    },
                });

                const createAdmission = await tx.admission.create({
                    data: {
                        patientId: appointment.patientId!,
                        sourceType: "FROM_APPOINTMENT",
                        sourceAppointmentId: appointment.id,
                        admittingDoctorId: doctor?.employeeInfo?.id || appointment.doctorId,
                        reason: body.reason,
                        admissionDateTime: body.admissionDateTime || new Date(),
                        expectedDischarge: body.expectedDischarge,
                    },
                });

                const bookingStart = body.admissionDateTime || new Date();

                const roomBooking = await tx.roomBooking.create({
                    data: {
                        roomId: body.roomId,
                        patientId: appointment.patientId!,
                        doctorId: appointment.doctor.userId,
                        startTime: bookingStart,
                        status: "CONFIRMED",
                        title: `Admission for ${appointment.patient?.user?.fName} ${appointment.patient?.user?.lName}`,
                        description: "Inpatient Admission",
                        roomCharges: 0,
                    },
                });

                const startSession = await tx.inpatientStaySession.create({
                    data: {
                        admissionId: createAdmission.id,
                        patientId: appointment.patientId!,
                        currentRoomBookingId: roomBooking.id,
                        startedAt: bookingStart,
                        status: "ACTIVE",
                    },
                });

                await tx.room.update({
                    where: { id: body.roomId },
                    data: {
                        status: room.capacity === room.currentOccupancy + 1 ? RoomStatus.OCCUPIED : RoomStatus.AVAILABLE,
                        currentOccupancy: {
                            increment: 1,
                        },
                    },
                });
                await tx.medicalHistory.create({
                    data: {
                        admissionId: createAdmission.id,
                        patientId: appointment.patientId!,
                    },
                });
                if (body.referralInfo && body.referralInfo?.referralType !== ReferralType.NONE) {
                    await tx.reference.create({
                        data: {
                            patientId: appointment.patientId!,
                            referralName: body.referralInfo.referralName,
                            referralContact: body.referralInfo.referralContact,
                            referralType: body.referralInfo.referralType,
                            concessionPercentage: body.referralInfo.concessionPercentage,
                            admissionId: createAdmission.id,
                            referralEmployeeId: body.referralInfo.referralEmployeeId,
                            referralId: body.referralInfo.referralId,
                        },
                    });
                }

                // Add Room Charge to Bill
                await addItemToBill({
                    patientId: appointment.patientId!,
                    entityId: room.roomTypeId,
                    entityType: BillItemType.ROOM,
                    tx,
                    billType: "IPD",
                    title: `Room Charges: ${room.roomNumber}`,
                    admissionId: createAdmission.id,
                });

                return createAdmission;
            });

            return apiSuccess(res, {
                data: transaction,
                message: "Patient admitted successfully",
            });
        } catch (error) {
            console.error(error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to admit patient from appointment",
            });
        }
    },

    async updateBillItem(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { unitPrice, quantity, title } = req.body;

            const item = await prisma.billItem.update({
                where: { id },
                data: {
                    unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined,
                    quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
                    title,
                    manualPrice: true,
                },
            });

            return apiSuccess(res, {
                data: item,
                message: "Bill item updated successfully",
            });
        } catch (error) {
            console.error(error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to update bill item",
            });
        }
    },

    async addBillAdjustment(req: Request, res: Response) {
        try {
            const { billId, billItemId, type, mode, value, reason } = req.body;

            if (!billId || !type || !mode || value === undefined) {
                return apiError(res, {
                    message: "Missing required fields for adjustment",
                });
            }

            const adjustment = await prisma.billAdjustment.create({
                data: {
                    billId,
                    billItemId,
                    type,
                    mode,
                    value: parseFloat(value),
                    reason,
                },
            });

            return apiSuccess(res, {
                data: adjustment,
                message: "Adjustment added successfully",
            });
        } catch (error) {
            console.error(error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to add adjustment",
            });
        }
    },

    async deleteBillItem(req: Request, res: Response) {
        try {
            const { id } = req.params;

            await prisma.billItem.update({
                where: { id },
                data: {
                    status: "REMOVED",
                },
            });

            return apiSuccess(res, {
                message: "Bill item removed successfully",
            });
        } catch (error) {
            console.error(error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to remove bill item",
            });
        }
    },

    async removeBillAdjustment(req: Request, res: Response) {
        try {
            const { id } = req.params;

            await prisma.billAdjustment.update({
                where: { id },
                data: {
                    active: false,
                },
            });

            return apiSuccess(res, {
                message: "Adjustment removed successfully",
            });
        } catch (error) {
            console.error(error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to remove adjustment",
            });
        }
    },
};
