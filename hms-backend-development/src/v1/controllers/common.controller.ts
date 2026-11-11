import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { apiError, apiSuccess } from "../utils/formatter";
import { Prisma, RoomStatus, Room, PriceEntityType, BillStatus, ReferralType } from "@prisma/client";
import { getActivePriceAmount } from "../utils/pricing.util";

async function getChangedFields(oldObj: Record<string, any>, newObj: Record<string, any>) {
    const changes: Record<
        string,
        {
            oldValue: any;
            newValue: any;
        }
    > = {};

    const keys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);

    for (const key of keys) {
        const oldValue = oldObj?.[key];
        const newValue = newObj?.[key];

        const isDifferent = JSON.stringify(oldValue) !== JSON.stringify(newValue);

        if (isDifferent) {
            changes[key] = {
                oldValue,
                newValue,
            };
        }
    }

    return changes;
}

export interface CommonControllerType {
    getAllDoctors: (req: Request, res: Response) => void;
    getAllPatients: (req: Request, res: Response) => void;
    getPatientByPatientId: (req: Request, res: Response) => void;
    getTimeSlots: (req: Request, res: Response) => void;
    getAllDepartments: (req: Request, res: Response) => void;
    getAllSpecialities: (req: Request, res: Response) => void;
    getAllRoomTypes: (req: Request, res: Response) => void;
    getAllRooms: (req: Request, res: Response) => void;
    getAllAmenities: (req: Request, res: Response) => void;
    getAllRoles: (req: Request, res: Response) => void;
    getPatientById: (req: Request, res: Response) => void;
    getAllEmployees: (req: Request, res: Response) => void;
    getAppointmentById: (req: Request, res: Response) => void;
    getAuditLog: (req: Request, res: Response) => void;
    getReferralCounts: (req: Request, res: Response) => void;
    getReferredPatients: (req: Request, res: Response) => void;
}

export const CommonController: CommonControllerType = {
    getAllDoctors: async (req, res) => {
        try {
            const { department, name, page = "1", limit = "10" } = req.query;

            const pageNum = Math.max(1, parseInt(String(page)) || 1);
            const limitNum = Math.max(1, parseInt(String(limit)) || 10);
            const skip = (pageNum - 1) * limitNum;

            const whereCondition: any = {
                isDoctor: true,
            };

            const filters: any[] = [];

            if (department) {
                filters.push({
                    employeeInfo: {
                        department: {
                            some: {
                                name: {
                                    contains: department,
                                    mode: "insensitive",
                                },
                            },
                        },
                    },
                });
            }

            if (name) {
                filters.push({
                    OR: [{ fName: { contains: name, mode: "insensitive" } }, { lName: { contains: name, mode: "insensitive" } }],
                });
            }

            if (filters.length > 0) {
                whereCondition.AND = filters;
            }

            const [allDoctors, total] = await Promise.all([
                prisma.user.findMany({
                    where: whereCondition,
                    select: {
                        id: true,
                        fName: true,
                        lName: true,
                        email: true,
                        employeeInfo: {
                            select: {
                                id: true,
                                experience: true,
                                qualification: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                                department: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                    skip: skip,
                    take: limitNum,
                    orderBy: {
                        createdAt: "desc",
                    },
                }),
                prisma.user.count({ where: whereCondition }),
            ]);

            const enrichedDoctors = await Promise.all(
                allDoctors.map(async (doc) => {
                    if (doc.employeeInfo) {
                        // @ts-ignore
                        doc.employeeInfo.consultationCharge = await getActivePriceAmount(PriceEntityType.DOCTOR_CONSULTATION, doc.employeeInfo.id);
                    }
                    return doc;
                }),
            );

            return apiSuccess(res, {
                data: enrichedDoctors,
                message: "All doctors fetched successfully.",
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
            console.error("Error fetching doctors:", error);
            return apiError(res, {
                message: "Failed to fetch doctors.",
            });
        }
    },
    getAllPatients: async (req, res) => {
        try {
            const page = Math.max(1, parseInt(String(req.query.page)) || 1);
            const limit = Math.max(1, parseInt(String(req.query.limit)) || 10);
            const skip = (page - 1) * limit;
            const whereAND: Prisma.UserWhereInput["AND"] = [];
            const search = req.query.search as string;
            if (search) {
                const searchTerms = search
                    .trim()
                    .split(/\s+/)
                    .filter((term) => term.length > 0);

                // For each term, create an OR condition that matches any of the fields
                const termConditions: Prisma.UserWhereInput[] = searchTerms.map((term) => ({
                    OR: [
                        { patientInfo: { id: { contains: term, mode: "insensitive" } } },
                        {
                            patientInfo: { email: { contains: term, mode: "insensitive" } },
                        },
                        {
                            patientInfo: {
                                phoneNumber: { contains: term, mode: "insensitive" },
                            },
                        },
                        { fName: { contains: term, mode: "insensitive" } },
                        { lName: { contains: term, mode: "insensitive" } },
                        { email: { contains: term, mode: "insensitive" } },
                    ],
                }));

                // All terms must match (AND across terms)
                whereAND.push({ AND: termConditions });
            }

            const [allPatients, total] = await Promise.all([
                prisma.user.findMany({
                    where: {
                        AND: whereAND,
                        isPatient: true,
                    },
                    select: {
                        id: true,
                        fName: true,
                        lName: true,
                        email: true,
                        phoneNumber: true,
                        patientInfo: {
                            select: {
                                id: true,
                                age: true,
                                gender: true,
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
                        isPatient: true,
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
    getPatientByPatientId: async (req, res) => {
        try {
            const patientId = req.params.id;
            const patient = await prisma.user.findFirst({
                where: {
                    patientInfo: {
                        id: patientId,
                    },
                },
                include: {
                    patientInfo: {
                        include: {
                            patientAppointments: {
                                take: 5,
                                orderBy: {
                                    appointmentDate: "desc",
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
                                    visits: {
                                        select: {
                                            id: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });
            return apiSuccess(res, {
                data: patient,
                message: "Patient fetched successfully.",
            });
        } catch (error) {
            return apiError(res, {
                message: "Failed to fetch patient.",
            });
        }
    },
    getTimeSlots: async (req, res) => {
        try {
            const timeSlots = await prisma.timeSlot.findMany({
                select: {
                    id: true,
                    startTime: true,
                    endTime: true,
                },
            });
            return apiSuccess(res, {
                data: timeSlots,
                message: "Time slots fetched successfully.",
            });
        } catch (error) {
            console.error("Error fetching time slots:", error);
            return apiError(res, {
                message: "Failed to fetch time slots.",
            });
        }
    },
    getAllDepartments: async (req, res) => {
        try {
            const { page = "1", limit = "10", name, search } = req.query;
            const pageNum = Math.max(1, parseInt(String(page)) || 1);
            const limitNum = Math.max(1, parseInt(String(limit)) || 10);
            const skip = (pageNum - 1) * limitNum;

            const where: any = {};

            if (name) {
                where.name = {
                    contains: name,
                    mode: "insensitive",
                };
            }

            if (search) {
                where.OR = [
                    {
                        name: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                ];
            }

            // const includeSelect: any = {};

            // includeSelect.speciality = {
            //     select: {
            //         id: true,
            //         name: true,
            //     },
            // };

            const total = await prisma.department.count({ where });

            const departments = await prisma.department.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: {
                    createdAt: "desc",
                },
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                    updatedAt: true,
                    // ...includeSelect,
                },
            });

            return apiSuccess(res, {
                data: departments,
                message: "Departments fetched successfully.",
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
            console.error("Error fetching departments:", error);
            return apiError(res, {
                message: "Failed to fetch departments.",
            });
        }
    },
    getAllSpecialities: async (req, res) => {
        try {
            const specialities = await prisma.speciality.findMany({});
            return apiSuccess(res, {
                data: specialities,
                message: "Specialities fetched successfully.",
            });
        } catch (error) {
            console.error("Error fetching specialities:", error);
            return apiError(res, {
                message: "Failed to fetch specialities.",
            });
        }
    },
    getAllRoomTypes: async (req, res) => {
        try {
            const roomTypes = await prisma.roomType.findMany({});
            return apiSuccess(res, {
                data: roomTypes,
                message: "Room types fetched successfully.",
            });
        } catch (error) {
            console.error("Error fetching room types:", error);
            return apiError(res, {
                message: "Failed to fetch room types.",
            });
        }
    },
    getAllRooms: async (req, res) => {
        try {
            const body: {
                roomType?: string[];
                status?: RoomStatus;
                amenities?: string[];
                acPreference?: string;
            } = req.body;

            const query: {
                page?: string;
                limit?: string;
            } = req.query;

            const page = Math.max(1, parseInt(String(query.page)) || 1);
            const limit = Math.max(1, parseInt(String(query.limit)) || 100);
            const skip = (page - 1) * limit;

            const filters: Prisma.RoomWhereInput[] = [];

            if (body?.roomType) {
                const types = Array.isArray(body.roomType) ? body.roomType : [body.roomType];

                filters.push({
                    roomType: {
                        name: {
                            in: types.map((t) => String(t)),
                        },
                    },
                });
            }

            if (body?.status) {
                filters.push({ status: body.status });
            }

            if (body?.acPreference) {
                if (body.acPreference === "AC") {
                    filters.push({
                        amenities: {
                            some: {
                                name: "AC",
                            },
                        },
                    });
                } else {
                    filters.push({
                        amenities: {
                            none: {
                                name: "AC",
                            },
                        },
                    });
                }
            }

            if (body?.amenities) {
                const amenitiesArray = Array.isArray(body.amenities) ? body.amenities : [body.amenities];
                filters.push({
                    amenities: {
                        some: {
                            name: {
                                in: amenitiesArray.map((a) => String(a)),
                            },
                        },
                    },
                });
            }

            const [total, allRooms] = await Promise.all([
                prisma.room.count({
                    where: {
                        AND: filters,
                    },
                }),
                prisma.room.findMany({
                    where: {
                        AND: filters,
                    },
                    select: {
                        id: true,
                        roomNumber: true,
                        capacity: true,
                        currentOccupancy: true,
                        roomType: {
                            select: { id: true, name: true },
                        },
                        amenities: {
                            select: { id: true, name: true, icon: true },
                        },
                        floor: {
                            select: { id: true, name: true },
                        },
                        status: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                    skip,
                    take: limit,
                    orderBy: {
                        createdAt: "desc",
                    },
                }),
            ]);

            const enrichedRooms = await Promise.all(
                allRooms.map(async (room) => ({
                    ...room,
                    roomType: room.roomType
                        ? {
                              ...room.roomType,
                              price: await getActivePriceAmount(PriceEntityType.ROOM_TYPE, room.roomType.id),
                          }
                        : room.roomType,
                })),
            );

            return apiSuccess(res, {
                data: enrichedRooms,
                metadata: {
                    page,
                    totalPages: Math.ceil(total / limit),
                    total,
                    limit,
                    hasNextPage: page < Math.ceil(total / limit),
                    hasPrevPage: page > 1,
                },
                message: "All rooms fetched successfully",
            });
        } catch (error) {
            console.error("Error fetching rooms:", error);
            return apiError(res, {
                message: "Failed to fetch rooms",
            });
        }
    },
    getAllAmenities: async (req, res) => {
        try {
            const amenities = await prisma.amenity.findMany({
                select: {
                    id: true,
                    name: true,
                    icon: true,
                },
            });
            return apiSuccess(res, {
                data: amenities,
                message: "Amenities fetched successfully.",
            });
        } catch (error) {
            console.error("Error fetching amenities:", error);
            return apiError(res, {
                message: "Failed to fetch amenities.",
            });
        }
    },
    getAllRoles: async (req, res) => {
        try {
            const roles = await prisma.role.findMany({
                select: {
                    id: true,
                    name: true,
                },
            });
            return apiSuccess(res, {
                data: roles,
                message: "Roles fetched successfully.",
            });
        } catch (error) {
            console.error("Error fetching roles:", error);
            return apiError(res, {
                message: "Failed to fetch roles.",
            });
        }
    },
    getPatientById: async (req, res) => {
        try {
            const id = req.params.id as string;
            const patient = await prisma.user.findUnique({
                where: {
                    id: id,
                },
                select: {
                    id: true,
                    fName: true,
                    lName: true,
                    email: true,
                    patientInfo: {
                        select: {
                            id: true,
                            age: true,
                            gender: true,
                        },
                    },
                },
            });
            return apiSuccess(res, {
                data: patient,
                message: "Patient fetched successfully.",
            });
        } catch (error) {
            console.error("Error fetching patient:", error);
            return apiError(res, {
                message: "Failed to fetch patient.",
            });
        }
    },
    getAllEmployees: async (req, res) => {
        try {
            const { name } = req.query;
            const whereCondition: any = {
                isDoctor: false,
                isAdmin: false,
                isPatient: false,
            };

            const filters: any[] = [];

            if (name) {
                filters.push({
                    OR: [{ fName: { contains: name, mode: "insensitive" } }, { lName: { contains: name, mode: "insensitive" } }],
                });
            }

            if (filters.length > 0) {
                whereCondition.AND = filters;
            }

            const [allEmployees, total] = await Promise.all([
                prisma.user.findMany({
                    where: whereCondition,
                    select: {
                        id: true,
                        fName: true,
                        lName: true,
                        email: true,
                        employeeInfo: {
                            select: {
                                id: true,
                                experience: true,
                                qualification: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                                department: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                }),
                prisma.user.count({ where: whereCondition }),
            ]);

            const enrichedEmployees = await Promise.all(
                allEmployees.map(async (emp) => {
                    if (emp.employeeInfo) {
                        // @ts-ignore
                        emp.employeeInfo.consultationCharge = await getActivePriceAmount(PriceEntityType.DOCTOR_CONSULTATION, emp.employeeInfo.id);
                    }
                    return emp;
                }),
            );

            return apiSuccess(res, {
                data: enrichedEmployees,
                message: "All employees fetched successfully.",
            });
        } catch (error) {
            console.error("Error fetching doctors:", error);
            return apiError(res, {
                message: "Failed to fetch doctors.",
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
                    paidAmount: true,
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
                apptAny.doctor.user.employeeInfo.consultationCharge = await getActivePriceAmount(PriceEntityType.DOCTOR_CONSULTATION, apptAny.doctor.user.employeeInfo.id);
            }

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
    getAuditLog: async (req, res) => {
        try {
            const { page = 1, limit = 10 } = req.query;
            const pageNum = parseInt(page as string);
            let limitNum = parseInt(limit as string);
            const MAX_LIMIT = 20;
            limitNum = Math.min(limitNum, MAX_LIMIT);

            const whereCondition: any = {};

            const [auditLogs, total] = await Promise.all([
                prisma.auditLog.findMany({
                    where: whereCondition,
                    select: {
                        id: true,
                        userId: true,
                        userRole: true,
                        userAgent: true,
                        entity: true,
                        entityId: true,
                        action: true,
                        createdAt: true,
                    },
                    skip: (pageNum - 1) * limitNum,
                    take: limitNum,
                    orderBy: { createdAt: "desc" },
                }),
                prisma.auditLog.count({ where: whereCondition }),
            ]);
            const userIds = new Set<string>();
            auditLogs.forEach((log) => {
                userIds.add(log.userId as string);
            });
            const users = await prisma.user.findMany({
                where: {
                    id: {
                        in: Array.from(userIds),
                    },
                },
                select: {
                    id: true,
                    fName: true,
                    lName: true,
                },
            });
            const safeParse = (value: any) => {
                if (!value) return null;
                if (typeof value === "string") {
                    try {
                        return JSON.parse(value);
                    } catch {
                        return value; // Return as is if not valid JSON
                    }
                }
                return value; // Return non-string values as-is
            };

            // Format the audit logs to show parsed changes
            const formattedLogs = auditLogs.map((log) => {
                return {
                    ...log,
                    userName: users.find((user) => user.id === log.userId)?.fName + " " + users.find((user) => user.id === log.userId)?.lName,
                };
            });
            return apiSuccess(res, {
                data: formattedLogs,
                metadata: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
                message: "Audit logs fetched successfully",
            });
        } catch (error) {
            console.error("Error fetching audit logs:", error);
            return apiError(res, {
                message: "Failed to fetch audit logs",
            });
        }
    },
    getReferralCounts: async (req: Request, res: Response) => {
        try {
            const { referralType, name, contact, startDate, endDate, page = "1", limit = "10" } = req.query;

            const pageNum = Number(page) || 1;
            const limitNum = Number(limit) || 10;

            // DATE FILTER

            const dateFilter: any = {};

            if (startDate || endDate) {
                dateFilter.updatedAt = {};

                if (startDate) {
                    const start = new Date(startDate as string);
                    start.setUTCHours(0, 0, 0, 0);

                    dateFilter.updatedAt.gte = start;
                }

                if (endDate) {
                    const end = new Date(endDate as string);
                    end.setUTCHours(23, 59, 59, 999);

                    dateFilter.updatedAt.lte = end;
                }
            }

            // COMMON BILL INCLUDE

            const patientInclude = {
                include: {
                    Bills: {
                        where: {
                            status: BillStatus.PAID,
                            payments: {
                                some: {
                                    amount: {
                                        gt: 0,
                                    },
                                },
                            },
                        },
                        select: {
                            payments: true,
                        },
                    },
                },
            } as const;

            // CALCULATE AMOUNT

            const calculateAmount = (patient: any) => {
                return patient?.Bills?.reduce((billAcc: number, bill: any) => billAcc + bill.payments.reduce((paymentAcc: number, payment: any) => paymentAcc + payment.amount, 0), 0) || 0;
            };
            const appointmentFilter = {
                OR: [
                    {
                        appointmentId: null,
                    },
                    {
                        appointment: {
                            status: {
                                notIn: ["IN_PROGRESS", "CANCELLED"],
                            },
                        },
                    },
                ],
            };
            // 1. INTERNAL + referralId NOT NULL

            const internalFromReferralUsers = await prisma.reference.findMany({
                where: {
                    referralType: ReferralType.INTERNAL,
                    referralId: { not: null },
                    ...dateFilter,
                    ...appointmentFilter,
                },
                include: {
                    patient: patientInclude,
                    referralUser: {
                        include: {
                            referralEmployee: {
                                include: {
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
            });

            // 2. INTERNAL + referralId NULL

            const internalDirect = await prisma.reference.findMany({
                where: {
                    referralType: ReferralType.INTERNAL,
                    referralId: null,
                    referralEmployeeId: { not: null },
                    ...dateFilter,
                    ...appointmentFilter,
                },
                include: {
                    patient: patientInclude,
                    referralEmployee: {
                        include: {
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
            });

            // 3. EXTERNAL + referralId NULL
            const externalTransient = await prisma.reference.findMany({
                where: {
                    referralType: ReferralType.EXTERNAL,
                    referralId: null,
                    ...dateFilter,
                    ...appointmentFilter,
                },
                select: {
                    id: true,
                    referralName: true,
                    referralContact: true,
                    referralType: true,
                    concessionPercentage: true,
                    updatedAt: true,
                    patient: patientInclude,
                },
            });

            // 4. EXTERNAL + referralId NOT NULL

            const externalPersisted = await prisma.reference.findMany({
                where: {
                    referralType: ReferralType.EXTERNAL,
                    referralId: { not: null },
                    ...dateFilter,
                    ...appointmentFilter,
                },
                include: {
                    patient: patientInclude,
                    referralUser: {
                        select: {
                            id: true,
                            referralName: true,
                            referralContact: true,
                            referralType: true,
                            concessionPercentage: true,
                            updatedAt: true,
                        },
                    },
                },
            });

            const referralMap = new Map();

            // INTERNAL - referralUsers

            for (const item of internalFromReferralUsers) {
                const emp = item.referralUser?.referralEmployee?.user;

                const empId = item.referralUser?.referralEmployee?.id;

                if (!empId) continue;

                if (!referralMap.has(empId)) {
                    referralMap.set(empId, {
                        id: item.id,
                        name: `${emp?.fName || ""} ${emp?.lName || ""}`.trim(),
                        contact: emp?.phoneNumber || null,
                        referralType: "INTERNAL",
                        concessionPercentage: item?.referralUser?.concessionPercentage,
                        updatedAt: item.referralUser?.updatedAt,
                        referralCount: 0,
                        totalAmount: 0,
                    });
                }
                referralMap.get(empId).referralCount++;
                referralMap.get(empId).totalAmount += calculateAmount(item.patient);
            }

            // INTERNAL - direct

            for (const item of internalDirect) {
                const emp = item.referralEmployee?.user;

                const empId = item.referralEmployee?.id;

                if (!empId) continue;

                if (!referralMap.has(empId)) {
                    referralMap.set(empId, {
                        id: item.id,
                        name: `${emp?.fName || ""} ${emp?.lName || ""}`.trim(),
                        contact: emp?.phoneNumber || null,
                        referralType: "INTERNAL",
                        concessionPercentage: item?.concessionPercentage,
                        updatedAt: item.updatedAt,
                        referralCount: 0,
                        totalAmount: 0,
                    });
                }
                referralMap.get(empId).referralCount++;
                referralMap.get(empId).totalAmount += calculateAmount(item.patient);
            }

            // EXTERNAL - transient

            for (const item of externalTransient) {
                const key = `${item.referralName}-${item.referralContact}`;

                if (!referralMap.has(key)) {
                    referralMap.set(key, {
                        id: item.id,
                        name: item.referralName,
                        contact: item.referralContact,
                        referralType: "EXTERNAL",
                        concessionPercentage: item.concessionPercentage,
                        updatedAt: item.updatedAt,
                        referralCount: 0,
                        totalAmount: 0,
                    });
                }
                referralMap.get(key).referralCount++;
                referralMap.get(key).totalAmount += calculateAmount(item.patient);
            }

            // EXTERNAL - persisted

            for (const item of externalPersisted) {
                const user = item.referralUser;

                if (!user) continue;

                const key = user.id;

                if (!referralMap.has(key)) {
                    referralMap.set(key, {
                        id: item.id,
                        name: user.referralName,
                        contact: user.referralContact,
                        referralType: "EXTERNAL",
                        concessionPercentage: user.concessionPercentage,
                        updatedAt: user.updatedAt,
                        referralCount: 0,
                        totalAmount: 0,
                    });
                }
                referralMap.get(key).referralCount++;
                referralMap.get(key).totalAmount += calculateAmount(item.patient);
            }

            // FINAL DATA

            let data = Array.from(referralMap.values());

            // referralType filter
            if (referralType) {
                data = data.filter((d) => d.referralType === (referralType as string).toUpperCase());
            }

            // name filter
            if (name) {
                data = data.filter((d) => d.name?.toLowerCase().includes((name as string).toLowerCase()));
            }

            // contact filter
            if (contact) {
                data = data.filter((d) => d.contact?.toLowerCase().includes((contact as string).toLowerCase()));
            }

            // sorting
            data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            // pagination
            const total = data.length;
            const paginatedData = data.slice((pageNum - 1) * limitNum, pageNum * limitNum);
            return res.status(200).json({
                success: true,
                data: paginatedData,
                metadata: {
                    total,
                    currentPage: pageNum,
                    totalPages: Math.ceil(total / limitNum),
                    itemsPerPage: limitNum,
                },
            });
        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch referral counts",
            });
        }
    },
    getReferredPatients: async (req: Request, res: Response) => {
        try {
            const { id, name, contact, startDate, endDate, page = "1", limit = "10" } = req.query;
            const pageNum = Number(page) || 1;
            const limitNum = Number(limit) || 10;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "Reference id is required",
                });
            }
            // DATE FILTER

            const dateFilter: any = {};

            if (startDate || endDate) {
                dateFilter.updatedAt = {};

                if (startDate) {
                    const start = new Date(startDate as string);
                    start.setUTCHours(0, 0, 0, 0);

                    dateFilter.updatedAt.gte = start;
                }

                if (endDate) {
                    const end = new Date(endDate as string);
                    end.setUTCHours(23, 59, 59, 999);

                    dateFilter.updatedAt.lte = end;
                }
            }
            const appointmentFilter = {
                OR: [
                    {
                        appointmentId: null,
                    },
                    {
                        appointment: {
                            status: {
                                notIn: ["IN_PROGRESS", "CANCELLED"],
                            },
                        },
                    },
                ],
            };
            const reference = await prisma.reference.findUnique({
                where: {
                    id: id as string,
                },

                include: {
                    referralUser: true,
                },
            });

            if (!reference) {
                return res.status(404).json({
                    success: false,
                    message: "Reference not found",
                });
            }

            let where: any = {};
            // referralId EXISTS → use ReferralUsers
            if (reference.referralId) {
                // INTERNAL
                if (reference.referralUser?.referralEmployeeId) {
                    where = {
                        AND: [
                            {
                                OR: [
                                    {
                                        referralUser: {
                                            referralEmployeeId: reference.referralUser.referralEmployeeId,
                                        },
                                    },
                                    {
                                        referralEmployeeId: reference.referralUser.referralEmployeeId,
                                    },
                                ],
                            },
                            dateFilter,
                            appointmentFilter,
                        ],
                    };
                }

                // EXTERNAL
                else {
                    where = {
                        AND: [
                            {
                                referralId: reference.referralId,
                            },
                            dateFilter,
                            appointmentFilter,
                        ],
                    };
                }
            } else {
                // INTERNAL
                if (reference.referralEmployeeId) {
                    where = {
                        AND: [
                            {
                                referralEmployeeId: reference.referralEmployeeId,
                            },
                            dateFilter,
                            appointmentFilter,
                        ],
                    };
                }

                // EXTERNAL
                else {
                    where = {
                        AND: [
                            {
                                referralId: null,
                                referralName: reference.referralName,
                                referralContact: reference.referralContact,
                            },
                            dateFilter,
                            appointmentFilter,
                        ],
                    };
                }
            }

            const references = await prisma.reference.findMany({
                where,
                include: {
                    patient: {
                        include: {
                            Bills: {
                                where: {
                                    payments: {
                                        some: {
                                            amount: {
                                                gt: 0,
                                            },
                                        },
                                    },
                                    status: BillStatus.PAID,
                                },
                                select: {
                                    payments: true,
                                },
                                orderBy: {
                                    createdAt: "desc",
                                },
                            },
                            user: {
                                select: {
                                    fName: true,
                                    lName: true,
                                    phoneNumber: true,
                                },
                            },
                        },
                    },
                    referralUser: {
                        include: {
                            referralEmployee: {
                                include: {
                                    user: {
                                        select: {
                                            fName: true,
                                            lName: true,
                                            phoneNumber: true,
                                            id: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },

                orderBy: {
                    updatedAt: "desc",
                },
            });

            let data = references.map((item) => ({
                referenceId: item.id,
                patientId: item.patient?.id,
                patientName: `${item.patient?.user?.fName || ""} ${item.patient?.user?.lName || ""}`.trim(),
                patientContact: item.patient?.user?.phoneNumber || null,
                concessionPercentage: item.concessionPercentage,
                referralType: item.referralType,
                referralId: item.referralId,
                amount: item.patient?.Bills?.reduce((acc, bill) => acc + bill.payments.reduce((acc, payment) => acc + payment.amount, 0), 0),
                referralName: item.referralName || item.referralUser?.referralName || item.referralUser?.referralEmployee?.user?.fName + " " + item.referralUser?.referralEmployee?.user?.lName,
                referralContact: item.referralContact || item.referralUser?.referralContact || item.referralUser?.referralEmployee?.user?.phoneNumber,
                referralEmployeeId: item.referralEmployeeId || item.referralUser?.referralEmployeeId,
                referredAt: item.updatedAt,
            }));
            // name filter
            if (name) {
                data = data.filter((d) => d.patientName?.toLowerCase().includes((name as string).toLowerCase()));
            }

            // contact filter
            if (contact) {
                data = data.filter((d) => d.patientContact?.toLowerCase().includes((contact as string).toLowerCase()));
            }
            const total = data.length;
            const paginatedData = data.slice((pageNum - 1) * limitNum, pageNum * limitNum);
            return res.status(200).json({
                success: true,
                data: paginatedData,
                metadata: {
                    total,
                    currentPage: pageNum,
                    totalPages: Math.ceil(total / limitNum),
                    itemsPerPage: limitNum,
                },
            });
        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch referred patients",
            });
        }
    },
};
