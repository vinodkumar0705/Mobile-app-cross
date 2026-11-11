import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { apiError } from "../utils/formatter";
import { apiSuccess } from "../utils/formatter";
import { Prisma, AppointmentStatus, AdmissionStatus, MedicalItemType, SurgeryStatus, TreatmentStatus, PriceEntityType, BillItemType, PhysioTherapyStatus } from "@prisma/client";
import { getActivePriceAmount } from "../utils/pricing.util";
import { addItemToBill } from "../utils/billing.util";
import { setServers } from "node:dns";
import { completeConsultationType } from "../types/doctor.types";
import cuid from "cuid";

/** Resolve catalog itemId or create/find a MedicalItem for typed (custom) medicine names. */
async function resolvePrescriptionItemId(tx: Prisma.TransactionClient, item: { itemId?: string; customMedicineName?: string }): Promise<string> {
    const id = item.itemId?.trim();
    if (id) {
        return id;
    }
    const name = item.customMedicineName?.trim();
    if (!name) {
        throw new Error("PRESCRIPTION_ITEM_MISSING");
    }
    const existing = await tx.medicalItem.findFirst({
        where: {
            name,
            itemType: MedicalItemType.MEDICINE,
            unit: "Tablet",
        },
    });
    if (existing) {
        return existing.id;
    }
    const created = await tx.medicalItem.create({
        data: {
            name,
            description: "Custom OPD prescription entry",
            itemType: MedicalItemType.MEDICINE,
            unit: "Tablet",
        },
    });
    return created.id;
}

export interface DoctorControllerType {
    getAllPatients: (req: Request, res: Response) => void;
    getPatientHistory: (req: Request, res: Response) => void;
    getDoctorAvailableAndUnavailableSlots: (req: Request, res: Response) => void;
    blockUnblockDoctorTimeSlot: (req: Request, res: Response) => void;
    addVitals: (req: Request, res: Response) => void;
    addDiet: (req: Request, res: Response) => void;
    searchPhysioTherapies: (req: Request, res: Response) => void;
    addPhysioTherapy: (req: Request, res: Response) => void;
    addVisit: (req: Request, res: Response) => void;
    addPrescription: (req: Request, res: Response) => void;
    createLabOrder: (req: Request, res: Response) => void;
    searchMedicines: (req: Request, res: Response) => void;
    getAllAppointments: (req: Request, res: Response) => void;
    getAllAdmissions: (req: Request, res: Response) => void;
    getAppointmentById: (req: Request, res: Response) => void;
    getAdmissionById: (req: Request, res: Response) => void;
    getInPatientHistory: (req: Request, res: Response) => void;
    approvePatientDischarge: (req: Request, res: Response) => void;
    dischargePatient: (req: Request, res: Response) => void;
    getPendingDischargeSummary: (req: Request, res: Response) => void;
    getDischargeSummaryById: (req: Request, res: Response) => void;
    completeConsultation: (req: Request, res: Response) => void;
    getPatientVisitsByAppointmentId: (req: Request, res: Response) => void;
    getPatientMedicalHistory: (req: Request, res: Response) => void;
    searchLabTests: (req: Request, res: Response) => void;
    searchSurgeries: (req: Request, res: Response) => void;
    addPatientProcedure: (req: Request, res: Response) => void;
    searchTreatments: (req: Request, res: Response) => void;
    addTreatment: (req: Request, res: Response) => void;
    updateTreatment: (req: Request, res: Response) => void;
    updatePatientProcedure: (req: Request, res: Response) => void;
    addPatientMeal: (req: Request, res: Response) => void;
    searchFoodItems: (req: Request, res: Response) => void;
    getDoctorsByPatientId: (req: Request, res: Response) => void;
}

export const DoctorController: DoctorControllerType = {
    getAllPatients: async (req, res) => {
        try {
            const user = await prisma.user.findUnique({
                where: {
                    id: req.user?.id,
                    isDoctor: true,
                },
            });

            const doc = await prisma.employeeInfo.findUnique({
                where: {
                    userId: req.user?.id,
                },
            });

            if (!doc) {
                return apiError(res, {
                    message: "Doctor not found.",
                });
            }

            const page = Math.max(1, parseInt(String(req.query.page)) || 1);
            const limit = Math.max(1, parseInt(String(req.query.limit)) || 10);
            const skip = (page - 1) * limit;
            const search = (req.query.search as string) || "";
            const searchDate = (req.query.date as string) || "";
            const patientType = (req.query.patientType as string) || "";
            const searchLower = patientType.toLowerCase();

            const whereAND: Prisma.UserWhereInput["AND"] = [
                {
                    patientInfo: {
                        isNot: null,
                    },
                },
                {
                    OR: [
                        {
                            patientInfo: {
                                patientAppointments: {
                                    some: {
                                        doctorId: doc.id,
                                    },
                                },
                            },
                        },
                        {
                            patientInfo: {
                                admissions: {
                                    some: {
                                        OR: [
                                            { admittingDoctorId: doc.id },
                                            {
                                                staySession: {
                                                    visits: {
                                                        some: {
                                                            doctorId: doc.id,
                                                        },
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    ],
                },
            ];
            if (searchLower === "inpatient") {
                // Patients with admissions (can also have appointments)
                whereAND.push({
                    patientInfo: {
                        admissions: {
                            some: {
                                OR: [
                                    { admittingDoctorId: doc.id },
                                    {
                                        staySession: {
                                            visits: {
                                                some: {
                                                    doctorId: doc.id,
                                                },
                                            },
                                        },
                                    },
                                ],
                                status: { not: AdmissionStatus?.CANCELLED },
                            },
                        },
                    },
                });
            } else if (searchLower === "outpatient") {
                // Only patients with appointments (no admissions)
                whereAND.push({
                    patientInfo: {
                        patientAppointments: {
                            some: {
                                doctorId: doc.id,
                                status: {
                                    notIn: [AppointmentStatus?.CANCELLED, AppointmentStatus.IN_PROGRESS],
                                },
                            },
                        },
                        // admissions: {
                        //     none: {
                        //         OR: [
                        //             { admittingDoctorId: doc.id },
                        //             {
                        //                 staySession: {
                        //                     visits: {
                        //                         some: {
                        //                             doctorId: doc.id,
                        //                         },
                        //                     },
                        //                 },
                        //             },
                        //         ],
                        //         status: { not: AdmissionStatus?.CANCELLED },
                        //     },
                        // },
                    },
                });
            } else if (searchLower === "all") {
                // All patients (both inpatient and outpatient)
                whereAND.push({
                    OR: [
                        {
                            patientInfo: {
                                patientAppointments: {
                                    some: {
                                        doctorId: doc.id,
                                        status: {
                                            notIn: [AppointmentStatus?.CANCELLED, AppointmentStatus.IN_PROGRESS],
                                        },
                                    },
                                },
                            },
                        },
                        {
                            patientInfo: {
                                admissions: {
                                    some: {
                                        OR: [
                                            { admittingDoctorId: doc.id },
                                            {
                                                staySession: {
                                                    visits: {
                                                        some: {
                                                            doctorId: doc.id,
                                                        },
                                                    },
                                                },
                                            },
                                        ],
                                        status: { not: AdmissionStatus?.CANCELLED },
                                    },
                                },
                            },
                        },
                    ],
                });
            }
            let startDate;
            let endDate;
            if (searchDate) {
                startDate = new Date(searchDate as string);
                startDate.setUTCHours(0, 0, 0, 0);

                endDate = new Date(searchDate as string);
                endDate.setUTCHours(23, 59, 59, 999);
            }
            if (searchDate) {
                // Date filter
                const parsedDate = new Date(searchDate as string);
                if (!isNaN(parsedDate.getTime())) {
                    whereAND.push({
                        OR: [
                            {
                                patientInfo: {
                                    patientAppointments: {
                                        some: {
                                            doctorId: doc.id,
                                            status: { not: AppointmentStatus?.CANCELLED },
                                            startTime: {
                                                gte: startDate,
                                                lt: endDate,
                                            },
                                        },
                                    },
                                },
                            },
                            {
                                patientInfo: {
                                    admissions: {
                                        some: {
                                            OR: [
                                                { admittingDoctorId: doc.id },
                                                {
                                                    staySession: {
                                                        visits: {
                                                            some: {
                                                                doctorId: doc.id,
                                                            },
                                                        },
                                                    },
                                                },
                                            ],
                                            status: { not: AdmissionStatus?.CANCELLED },
                                            admissionDateTime: {
                                                gte: startDate,
                                                lt: endDate,
                                            },
                                        },
                                    },
                                },
                            },
                        ],
                    });
                }
            }
            if (search) {
                const terms = search.trim().split(/\s+/);

                // Build an AND condition for every term
                const termConditions: Prisma.UserWhereInput[] = terms.map((term) => ({
                    OR: [{ fName: { contains: term, mode: "insensitive" } }, { lName: { contains: term, mode: "insensitive" } }, { phoneNumber: { contains: term, mode: "insensitive" } }],
                }));

                whereAND.push({ AND: termConditions });
            }
            const [allPatients, total] = await Promise.all([
                prisma.user.findMany({
                    where: {
                        AND: whereAND,
                    },
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
                                height: true,
                                weight: true,
                                patientAppointments: {
                                    where: {
                                        doctorId: doc.id,
                                        status: { not: AppointmentStatus?.CANCELLED },
                                        startTime: {
                                            gte: startDate,
                                            lt: endDate,
                                        },
                                    },
                                    select: {
                                        id: true,
                                        appointmentDate: true,
                                        startTime: true,
                                        status: true,
                                    },
                                    orderBy: {
                                        startTime: "desc",
                                    },
                                    take: 1,
                                },
                                admissions: {
                                    where: {
                                        OR: [
                                            { admittingDoctorId: doc.id },
                                            {
                                                staySession: {
                                                    visits: {
                                                        some: {
                                                            doctorId: doc.id,
                                                        },
                                                    },
                                                },
                                            },
                                        ],
                                        status: { not: AdmissionStatus?.CANCELLED },
                                    },
                                    select: {
                                        id: true,
                                        admissionDateTime: true,
                                        status: true,
                                        admittingDoctorId: true,
                                        staySession: {
                                            select: {
                                                visits: {
                                                    where: {
                                                        doctorId: doc.id,
                                                    },
                                                    select: {
                                                        id: true,
                                                        visitDate: true,
                                                        visitType: true,
                                                    },
                                                    orderBy: {
                                                        visitDate: "desc",
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
                    skip: skip,
                    take: limit,
                    orderBy: {
                        createdAt: "desc",
                    },
                }),
                prisma.user.count({
                    where: {
                        AND: whereAND,
                    },
                }),
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
            });
        }
    },
    async getAllAppointments(req, res) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user?.id, isDoctor: true },
            });
            if (!user) {
                return res.status(401).json({ message: "Only doctors can access appointments" });
            }
            const doc = await prisma.employeeInfo.findUnique({
                where: { userId: req.user?.id },
            });

            if (!doc) {
                return res.status(404).json({ message: "Doctor profile not found" });
            }
            const { status, appointmentDate, patientName, phoneNumber, page = "1", limit = "10" } = req.query;

            const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
            const limitNum = Math.max(1, parseInt(String(limit), 10) || 10);
            const skip = (pageNum - 1) * limitNum;

            const filters: Prisma.AppointmentWhereInput[] = [{ doctorId: doc.id }];

            // Base status filter - only CONFIRMED and COMPLETED by default
            filters.push({
                status: {
                    in: ["CONFIRMED", "COMPLETED"],
                },
            });

            // Handle appointmentDate separately (exact date filter)
            if (appointmentDate) {
                const dateStr = String(appointmentDate).trim();
                const date = new Date(dateStr);

                if (!isNaN(date.getTime())) {
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
            }

            if (status) {
                const validStatuses: AppointmentStatus[] = ["CONFIRMED", "COMPLETED"];

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

            // if (filters.length > 0) {
            //     whereCondition.AND = filters;
            // }
            const whereCondition: Prisma.AppointmentWhereInput = {
                AND: filters,
            };
            const [appointments, total] = await Promise.all([
                prisma.appointment.findMany({
                    where: whereCondition,
                    skip,
                    take: limitNum,
                    select: {
                        id: true,
                        appointmentDate: true,
                        paidAmount: true,
                        startTime: true,
                        endTime: true,
                        status: true,
                        reason: true,
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
                                        fName: true,
                                        lName: true,
                                    },
                                },
                            },
                        },
                        referral: {
                            select: {
                                id: true,
                                referralName: true,
                                referralContact: true,
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

            return apiSuccess(res, {
                data: appointments,
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
                message: "Failed to retrieve appointments",
            });
        }
    },
    async getAllAdmissions(req, res) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user?.id, isDoctor: true },
            });
            if (!user) {
                return res.status(401).json({ message: "Only doctors can access admissions" });
            }

            const doc = await prisma.employeeInfo.findUnique({
                where: { userId: req.user?.id },
            });
            if (!doc) {
                return res.status(404).json({ message: "Doctor profile not found" });
            }

            const { date, page = "1", limit = "10", search, filterType } = req.query;
            const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
            const limitNum = Math.max(1, parseInt(String(limit), 10) || 10);
            const skip = (pageNum - 1) * limitNum;

            const filters: Prisma.AdmissionWhereInput[] = [
                { status: { notIn: ["DISCHARGED", "CANCELLED"] } },
                {
                    OR: [
                        { admittingDoctorId: doc.id },
                        {
                            staySession: {
                                visits: {
                                    some: { doctorId: doc.id },
                                },
                            },
                        },
                    ],
                },
            ];

            const additionalFilters: Prisma.AdmissionWhereInput[] = [];

            // Date filter (UTC day boundaries)
            if (date) {
                const parsedDate = new Date(date as string);
                if (!isNaN(parsedDate.getTime())) {
                    const startDate = new Date(parsedDate);
                    startDate.setUTCHours(0, 0, 0, 0);
                    const endDate = new Date(parsedDate);
                    endDate.setUTCHours(23, 59, 59, 999);
                    additionalFilters.push({
                        admissionDateTime: {
                            gte: startDate,
                            lte: endDate,
                        },
                    });
                }
            }

            // Search filters (patient name, phone number, status)
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
                        const validStatuses: AdmissionStatus[] = ["PLANNED", "ADMITTED", "DISCHARGE_STARTED"];
                        const searchForStatus = searchTerm.toLowerCase().trim().replace(/[\s_]/g, "");
                        const matchingStatuses = validStatuses.filter((status) => status.toLowerCase().replace(/_/g, "").includes(searchForStatus));
                        filterCondition = {
                            status: { in: matchingStatuses.length ? matchingStatuses : [] },
                        };
                        break;
                }

                if (Object.keys(filterCondition).length > 0) {
                    additionalFilters.push(filterCondition);
                }
            }

            // 6. Combine mandatory + optional filters using AND
            const whereCondition: Prisma.AdmissionWhereInput = {
                AND: [...filters, ...additionalFilters],
            };

            // 7. Execute queries with pagination
            const [admissions, total] = await Promise.all([
                prisma.admission.findMany({
                    where: whereCondition,
                    skip,
                    take: limitNum,
                    select: {
                        id: true,
                        status: true,
                        admissionDateTime: true,
                        reason: true,
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
                                        bloodGroup: true,
                                        phoneNumber: true,
                                    },
                                },
                            },
                        },
                        staySession: {
                            select: { id: true },
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
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { admissionDateTime: "desc" },
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
                message: "Unable to fetch admissions",
            });
        }
    },
    async getAppointmentById(req, res) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user?.id, isDoctor: true },
            });
            if (!user) {
                return res.status(401).json({ message: "Only doctors can access admissions" });
            }

            const doc = await prisma.employeeInfo.findUnique({
                where: { userId: req.user?.id },
            });
            if (!doc) {
                return res.status(404).json({ message: "Doctor profile not found" });
            }
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
                            referralEmployeeId: true,
                        },
                    },
                },
            });
            const apptAny = appointment as any;
            if (apptAny?.doctor?.user?.employeeInfo) {
                apptAny.doctor.user.employeeInfo.consultationCharge = await getActivePriceAmount(PriceEntityType.DOCTOR_CONSULTATION, apptAny.doctor.user.id);
            }
            return apiSuccess(res, {
                data: appointment,
                message: "Appointment retrieved successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch appointment",
            });
        }
    },
    async getAdmissionById(req, res) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user?.id, isDoctor: true },
            });
            if (!user) {
                return res.status(401).json({ message: "Only doctors can access admissions" });
            }

            const doc = await prisma.employeeInfo.findUnique({
                where: { userId: req.user?.id },
            });
            if (!doc) {
                return res.status(404).json({ message: "Doctor profile not found" });
            }
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
                            id: true,
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
                                    id: true,
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
                },
            });
            return apiSuccess(res, {
                data: admission,
                message: "Admission retrieved successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch admission",
            });
        }
    },
    async addDiet(req, res) {
        // Implementation for adding diet
        try {
            const { patientId, specialInstructions, dieticianNotes, dieticianName, appointmentId, admissionId } = req.body;

            if (!patientId) {
                return res.status(400).json({ message: "patientId is required" });
            }
            const result = await prisma.$transaction(
                async (tx) => {
                    const dietRecord = await tx.diet.create({
                        data: {
                            patientId,
                            specialInstructions: specialInstructions || null,
                            dieticianNotes: dieticianNotes || null,
                            dieticianName: dieticianName || null,
                            admissionId: admissionId || null,
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
    async addVitals(req, res) {
        // Implementation for adding vitals
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user?.id, isDoctor: true },
            });
            if (!user) {
                return res.status(401).json({ message: "Only doctors can access admissions" });
            }

            const doc = await prisma.employeeInfo.findUnique({
                where: { userId: req.user?.id },
            });
            if (!doc) {
                return res.status(404).json({ message: "Doctor profile not found" });
            }
            const {
                patientId,
                time,
                temperature,
                bp,
                weight,
                weightUnit,
                height,
                heightUnit,
                pulse,
                spo2,
                bloodSugar,
                bloodSugarUnit,
                temperatureUnit,
                bpUnit,
                pulseUnit,
                spo2Unit,
                appointmentId,
                admissionId,
            } = req.body;

            if (!patientId) {
                return res.status(400).json({ message: "patientId is required" });
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
                            recordedBy: doc?.id,
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
    async searchMedicines(req, res) {
        try {
            const query: {
                search?: string;
                itemType?: MedicalItemType;
            } = req.query;

            const search = query.search?.trim();
            // if (!search || search.toString().length < 2) {
            //     return apiSuccess(res, {
            //         data: [],
            //         message: "Search term must be at least 2 characters long",
            //     });
            // }
            const filters: Prisma.MedicalItemWhereInput[] = [];
            if (search) {
                const orConditions: Prisma.MedicalItemWhereInput["OR"] = [
                    { name: { contains: search, mode: "insensitive" } },
                    { genericName: { contains: search, mode: "insensitive" } },
                    { brand: { contains: search, mode: "insensitive" } },
                ];
                filters.push({ OR: orConditions });
            }
            if (query.itemType) {
                filters.push({ itemType: query.itemType });
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
                    const batchId = item.batches[0]?.id || null;
                    const unitPrice = batchId ? await getActivePriceAmount(PriceEntityType.PHARMACY, batchId) : 0;
                    return {
                        id: item.id,
                        label: `${item.name} ${item.strength || ""}${item.unit || ""} ${item.brand ? `(${item.brand})` : ""}`,
                        name: item.name,
                        genericName: item.genericName,
                        brand: item.brand,
                        strength: item.strength,
                        unit: item.unit,
                        dosageForm: item.dosageForm,
                        availableStock: item.batches.reduce((sum, batch) => sum + batch.quantity, 0),
                        batchId,
                        unitPrice,
                    };
                }),
            );

            return apiSuccess(res, {
                metadata: {
                    MedicalItemType: MedicalItemType,
                },
                data: response,
                message: "Medical items searched successfully",
            });
        } catch (error) {
            console.error("Search medical items error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    async getDoctorAvailableAndUnavailableSlots(req, res) {
        try {
            const user = await prisma.user.findUnique({
                where: {
                    id: req.user?.id,
                    isDoctor: true,
                },
            });
            const doc = await prisma.employeeInfo.findUnique({
                where: {
                    userId: req.user?.id,
                },
            });
            const userId = user?.id;
            const { selectedDate } = req.query;

            if (!userId || !selectedDate) {
                return res.status(400).json({ message: "userId and selectedDate are required" });
            }

            // Parse the selected date
            const date = new Date(String(selectedDate));
            date.setHours(0, 0, 0, 0);
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);

            // Get current date at midnight for comparison
            const now = new Date();
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);

            // Check if selected date is today
            const isToday = date.getTime() === currentDate.getTime();

            // Get all leaves with exception dates
            const leaves = await prisma.unavailability.findMany({
                where: {
                    userId: String(userId),
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
                        excDate.setHours(0, 0, 0, 0);
                        // Include today and future dates
                        return excDate >= currentDate;
                    }),
                }))
                .filter((i) => i.exceptionDates.length > 0);

            // Check if selected date is in any exception dates
            const isExceptionDate = filteredLeaves.some((leave) =>
                leave.exceptionDates.some((exceptionDateStr) => {
                    const excDate = new Date(exceptionDateStr);
                    excDate.setHours(0, 0, 0, 0);
                    return excDate.getTime() === date.getTime();
                }),
            );

            // Step 1: Check for all-day unavailability
            const allDayUnavailability = await prisma.unavailability.findFirst({
                where: {
                    userId: String(userId),
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

                // Extract local hours and minutes
                const startHours = dbStartTime.getHours();
                const startMinutes = dbStartTime.getMinutes();
                const endHours = dbEndTime.getHours();
                const endMinutes = dbEndTime.getMinutes();

                // Create slot for selected date with extracted time (local time)
                const slotStartTime = new Date(date);
                slotStartTime.setHours(startHours, startMinutes, 0, 0);

                const slotEndTime = new Date(date);
                slotEndTime.setHours(endHours, endMinutes, 0, 0);

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
                    doctorId: String(doc?.id),
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
                    userId: String(userId),
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
                const isBooked = appointments.some((app) => app.startTime && app.startTime < endTime && app.endTime && app.endTime > startTime);

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
    async blockUnblockDoctorTimeSlot(req, res) {
        const { block, startTime, endTime, isAllDay, isRecurring, exceptionDates, timeZone } = req.body;
        try {
            const user = await prisma.user.findUnique({
                where: {
                    id: req.user?.id,
                    isDoctor: true,
                },
            });
            // Validate required inputs
            if (!user?.id || !startTime) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "userId and startTime are required",
                });
            }

            // Only validate endTime when blocking (creating a record)
            if (block) {
                // Validate endTime for non-all-day events
                if (!endTime && !isAllDay) {
                    return apiError(res, {
                        statusCode: "BAD_REQUEST",
                        message: "EndTime is required",
                    });
                }

                // Prepare data for creation
                const data: any = {
                    userId: String(user?.id),
                    startTime: new Date(startTime),
                    isAllDay: isAllDay || false,
                    isRecurring: isRecurring || false,
                    timeZone: timeZone || "UTC",
                };

                // Add endTime if provided
                if (endTime) {
                    data.endTime = new Date(endTime);
                }

                // Add exception dates if provided
                if (exceptionDates && Array.isArray(exceptionDates)) {
                    data.exceptionDates = exceptionDates.map((date) => new Date(date));
                }

                // Create the unavailability record
                const unavailability = await prisma.unavailability.create({
                    data: data,
                });

                // Determine message based on exception dates
                const message = exceptionDates && exceptionDates.length > 0 ? "Doctor leave applied successfully" : "Doctor time slot blocked successfully";

                return apiSuccess(res, {
                    data: unavailability,
                    message: message,
                });
            } else {
                // CANCEL LEAVE DATE

                if (exceptionDates && Array.isArray(exceptionDates) && exceptionDates.length > 0) {
                    const targetDate = new Date(exceptionDates[0]);

                    targetDate.setUTCHours(0, 0, 0, 0);

                    // Fetch all leave records
                    const allLeaves = await prisma.unavailability.findMany({
                        where: {
                            userId: String(user.id),
                            exceptionDates: {
                                isEmpty: false,
                            },
                        },
                    });

                    // Find leave containing target date
                    const unavailability = allLeaves.find((leave) =>
                        leave.exceptionDates.some((date) => {
                            const d = new Date(date);

                            return d.getUTCFullYear() === targetDate.getUTCFullYear() && d.getUTCMonth() === targetDate.getUTCMonth() && d.getUTCDate() === targetDate.getUTCDate();
                        }),
                    );

                    if (!unavailability) {
                        return apiError(res, {
                            statusCode: "NOT_FOUND",
                            message: "Leave not found",
                        });
                    }

                    // Remove only selected leave date
                    const updatedExceptionDates = (unavailability.exceptionDates || []).filter((date) => {
                        const d = new Date(date);
                        const isSame = d.getUTCFullYear() === targetDate.getUTCFullYear() && d.getUTCMonth() === targetDate.getUTCMonth() && d.getUTCDate() === targetDate.getUTCDate();
                        return !isSame;
                    });

                    // If no dates left -> delete record
                    if (updatedExceptionDates.length === 0) {
                        await prisma.unavailability.delete({
                            where: {
                                id: unavailability.id,
                            },
                        });
                    } else {
                        await prisma.unavailability.update({
                            where: {
                                id: unavailability.id,
                            },
                            data: {
                                exceptionDates: updatedExceptionDates,
                            },
                        });
                    }

                    return apiSuccess(res, {
                        data: null,
                        message: "Leave cancelled successfully",
                    });
                }
                // UNBLOCK TIME SLOT

                const unavailability = await prisma.unavailability.findFirst({
                    where: {
                        userId: String(user.id),
                        startTime: new Date(startTime),
                    },
                });

                if (!unavailability) {
                    return apiError(res, {
                        statusCode: "NOT_FOUND",
                        message: "Blocked slot not found",
                    });
                }

                await prisma.unavailability.delete({
                    where: {
                        id: unavailability.id,
                    },
                });

                return apiSuccess(res, {
                    data: null,
                    message: "Doctor time slot unblocked successfully",
                });
            }
        } catch (error) {
            console.error("Error blocking doctor time slot:", error);
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to block doctor time slot",
            });
        }
    },
    async addVisit(req, res) {
        try {
            const user = await prisma.user.findUnique({
                where: {
                    id: req.user?.id,
                    isDoctor: true,
                },
            });
            const doc = await prisma.employeeInfo.findUnique({
                where: {
                    userId: req.user?.id,
                },
            });
            const { patientId, doctorId, chiefComplaint, admissionId, diagnosis, visitDate, history, examination, visitType, inpatientStaySessionId } = req.body;
            if (!user?.id || !patientId || !diagnosis || !visitDate || !doctorId) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "userId, patientId, doctorId, chiefComplaint, diagnosis, and visitDate are required",
                });
            }
            // Check if doctor exists
            const doctorExists = await prisma.employeeInfo.findUnique({
                where: { id: String(doc?.id) },
                include: { user: true },
            });

            if (!doctorExists) {
                return res.status(400).json({ message: "Doctor not found with the provided ID" });
            }

            // Check if patient exists
            const patientExists = await prisma.patientInfo.findUnique({
                where: { id: patientId },
            });

            if (!patientExists) {
                return res.status(400).json({ message: "Patient not found with the provided ID" });
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
                        billType:"IPD",
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
            const { patientId, prescriptionItems, notes, visitId } = req.body;
            const user = await prisma.user.findUnique({
                where: { id: req.user?.id },
            });
            const doc = await prisma.employeeInfo.findUnique({
                where: { userId: req.user?.id },
            });
            if (!user || !doc) {
                return res.status(404).json({ message: "User or Doctor not found" });
            }
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
                        doctorId: String(doc?.id),
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
                where: {
                    id: req.user?.id,
                    isDoctor: true,
                },
            });
            const doc = await prisma.employeeInfo.findUnique({
                where: {
                    userId: req.user?.id,
                },
            });
            const { patientId, testIds, notes, orderDate, status, admissionId } = req.body;
            if (!user?.id || !patientId || !testIds || !admissionId) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "admissionId,patientId and testIds (non-empty array) are required",
                });
            }
            const result = await prisma.$transaction(
                async (tx) => {
                    const labOrder = await tx.labOrder.create({
                        data: {
                            patientId: patientId,
                            doctorId: String(doc?.id),
                            testIds: {
                                connect: testIds.map((testId: string) => ({
                                    id: testId,
                                })),
                            },
                            notes: notes,
                            admissionId: admissionId,
                            status: status,
                            orderDate: orderDate ? new Date(orderDate) : new Date(),
                        },
                    });
                    const medicalHistory = await tx.medicalHistory.create({
                        data: {
                            admissionId: admissionId,
                            patientId: patientId,
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
                {
                    maxWait: 60000,
                    timeout: 60000,
                },
            );
            return apiSuccess(res, {
                data: result,
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
            const user = await prisma.user.findUnique({
                where: {
                    id: req.user?.id,
                    isDoctor: true,
                },
            });
            const doc = await prisma.employeeInfo.findUnique({
                where: {
                    userId: req.user?.id,
                },
            });
            const { patientId, admissionId, doctorId, physioConfigId, status, notes, sessionDate, exercise, duration, time, sets, reps, difficultyLevel } = req.body;
            if (!admissionId || !patientId || !sessionDate || !physioConfigId) {
                return res.status(400).json({ message: " patientId, doctorId,sessionDate and physioConfigId are required" });
            }
            const result = await prisma.$transaction(
                async (tx) => {
                    const physioTherapy = await prisma.physioTherapy.create({
                        data: {
                            patientId: patientId,
                            admissionId: admissionId,
                            doctorId: doctorId,
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
                return res.status(400).json({
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

                        await tx.room.update({
                            where: { id: roomBooking.roomId ?? undefined },
                            data: {
                                currentOccupancy: {
                                    decrement: 1,
                                },
                                status: newOccupancy <= 0 ? "CLEANING_IN_PROGRESS" : "OCCUPIED",
                            },
                        });
                    } else if (admission.staySession?.currentRoomBooking?.roomId) {
                        await tx.room.update({
                            where: { id: admission.staySession.currentRoomBooking.roomId ?? undefined },
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
                            patientInstructions,
                            dischargeSummaryInstructions,
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
                message: "Unable to fetch inpatient history",
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
                treatments,
                patientProcedures,
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
                    ...(prescribedTo && { prescribedTo }),
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
                message: "Unable to fetch inpatient history",
            });
        }
    },
    async approvePatientDischarge(req, res) {
        try {
            const { doctorId, approvedByDoctor, admissionId, patientId } = req.body;
            if (!admissionId || !patientId || !doctorId || approvedByDoctor === undefined) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "admissionId, patientId, doctorId, and approvedByDoctor are required",
                });
            }

            const result = await prisma.$transaction(
                async (prisma) => {
                    const admissionData = await prisma.admission.findUnique({
                        where: { id: admissionId },
                    });
                    if (!admissionData) {
                        throw new Error("Admission not found");
                    }

                    if (admissionData.status !== "ADMITTED") {
                        throw new Error(`Cannot process discharge for admission with status: ${admissionData.status}. Admission must be in ADMITTED status.`);
                    }

                    if (admissionData.admittingDoctorId !== doctorId) {
                        throw new Error("Only the assigned doctor can approve this discharge");
                    }

                    // If approved, update admission status to DISCHARGE_PENDING
                    if (approvedByDoctor === true) {
                        await prisma.admission.update({
                            where: {
                                id: admissionId,
                                status: "ADMITTED",
                            },
                            data: {
                                status: "DISCHARGE_STARTED",
                            },
                        });
                    }
                    const dischargeSummary = await prisma.dischargeSummary.create({
                        data: {
                            admissionId: admissionId,
                            patientId: patientId,
                            doctorId: doctorId,
                            approvedByDoctor: approvedByDoctor,
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
                message: approvedByDoctor ? "Discharge summary approved and patient discharged successfully" : "Discharge summary rejected",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to approve discharge summary",
            });
        }
    },
    async getPendingDischargeSummary(req, res) {
        try {
            const { doctorId } = req.query;

            if (!doctorId) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "doctorId is required",
                });
            }

            const pendingSummaries = await prisma.dischargeSummary.findMany({
                where: {
                    doctorId: doctorId as string,
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
                orderBy: {
                    createdAt: "desc",
                },
            });

            return apiSuccess(res, {
                data: pendingSummaries,
                message: `Found ${pendingSummaries.length} pending discharge summary approvals`,
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch pending discharge summary approvals",
            });
        }
    },
    async getDischargeSummaryById(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return apiError(res, {
                    statusCode: "BAD_REQUEST",
                    message: "Discharge summary ID is required",
                });
            }

            const dischargeSummary = await prisma.dischargeSummary.findUnique({
                where: { id: id },
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
                return apiError(res, {
                    statusCode: "NOT_FOUND",
                    message: "Discharge summary not found",
                });
            }

            return apiSuccess(res, {
                data: dischargeSummary,
                message: "Discharge summary retrieved successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to fetch discharge summary",
            });
        }
    },

    async completeConsultation(req, res) {
        try {
            const { id } = req.params;
            const body: completeConsultationType = req.body;
            const user = await prisma.user.findUnique({
                where: { id: req.user?.id, isDoctor: true },
            });
            if (!user) {
                return res.status(401).json({ message: "Only doctors can access appointments" });
            }
            const doc = await prisma.employeeInfo.findUnique({
                where: { userId: req.user?.id },
            });

            if (!doc) {
                return res.status(401).json({ message: "Only doctors can access appointments" });
            }

            const appointment = await prisma.appointment.findUnique({
                where: { id: id },
            });
            if (!appointment) {
                return res.status(404).json({ message: "Appointment not found" });
            }
            if (appointment.doctorId !== doc.id) {
                return res.status(401).json({
                    message: "You are not authorized to access this appointment",
                });
            }
            if (appointment.status !== AppointmentStatus.CONFIRMED) {
                return res.status(400).json({ message: "Appointment is not confirmed" });
            }

            if (!appointment.patientId) {
                return res.status(400).json({ message: "No patient associated with this appointment" });
            }

            const result = await prisma.$transaction(
                async (tx) => {
                    const updatedAppointment = await tx.appointment.update({
                        where: { id: id },
                        data: {
                            status: AppointmentStatus.COMPLETED,
                        },
                    });
                    const createvisit = await tx.visit.create({
                        data: {
                            appointmentId: id,
                            doctorId: doc.id,
                            visitDate: new Date(),
                            visitType: "OPD",
                            diagnosis: body.diagnosis,
                            examination: body.examination,
                            chiefComplaint: body.chiefComplaint,
                            patientId: appointment.patientId as string,
                            testReportsToCarry: body.testReportsToCarry,
                            nextReviewDate: body.nextReviewDate,
                        },
                    });
                    const vitals = await tx.vitals.create({
                        data: {
                            ...body.vitals,
                        },
                    });
                    const patientvitals = await tx.patientVitals.create({
                        data: {
                            patientId: appointment.patientId as string,
                            recordedBy: doc.id,
                            appointmentId: id,
                            vitalsId: vitals.id,
                            visitId: createvisit.id,
                        },
                    });
                    const prescriptionItemsData = await Promise.all(
                        body.prescription.map(async (item) => {
                            const itemId = await resolvePrescriptionItemId(tx, {
                                itemId: item.itemId,
                                customMedicineName: item.customMedicineName,
                            });
                            return {
                                itemId,
                                dosage: item.dosage,
                                frequency: item.frequency,
                                duration: item.duration,
                                timing: item.timing as any,
                            };
                        }),
                    );

                    const prescription = await tx.prescription.create({
                        data: {
                            visitId: createvisit.id,
                            doctorId: doc.id,
                            patientId: appointment.patientId as string,
                            discount: body.discount,
                            prescriptionItems: {
                                createMany: {
                                    data: prescriptionItemsData,
                                },
                            },
                        },
                    });
                    const medicalHistory = await tx.medicalHistory.create({
                        data: {
                            patientId: appointment.patientId as string,
                            visitId: createvisit.id,
                            prescriptionId: prescription.id,
                            patientVitalsId: patientvitals.id,
                            appointmentId: id,
                        },
                    });
                    return {
                        updatedAppointment,
                        createvisit,
                        patientvitals,
                        prescription,
                        medicalHistory,
                    };
                },
                {
                    maxWait: 60000,
                    timeout: 60000,
                },
            );
            return apiSuccess(res, {
                data: result,
                message: "Appointment completed successfully",
            });
        } catch (error) {
            return apiError(res, {
                statusCode: "INTERNAL_SERVER_ERROR",
                message: "Unable to complete appointment",
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
                return res.status(404).json({ message: "Visit not found" });
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

            const procedure = await prisma.patientProcedure.update({
                where: { id },
                data: updateData,
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
                const meal = await prisma.patientMeal.create({
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
};
