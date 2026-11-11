import { prisma } from "@/lib/prisma";
import { Request, Response } from "express";
import { apiError, apiSuccess } from "../utils/formatter";
import { Employee } from "../types/employee.types";
import bcrypt from "bcryptjs";
import { PriceEntityType, Prisma } from "@prisma/client";
import { generateOrganizationScopedId } from "@/lib/generateOrganizationScopedId";
import { deletePrices, getActivePriceAmount, upsertPriceRule } from "../utils/pricing.util";

export interface EmployeeControllerType {
    createEmployee: (req: Request, res: Response) => void;
    getAllEmployees: (req: Request, res: Response) => void;
    getAllEmployeesWithoutPagination: (req: Request, res: Response) => void;
    getEmployee: (req: Request, res: Response) => void;
    updateEmployee: (req: Request, res: Response) => void;
    deleteEmployee: (req: Request, res: Response) => void;
    generatePassword: (doctor: Partial<Prisma.UserCreateInput>) => Promise<string>;
}
export const EmployeeController: EmployeeControllerType = {
    async generatePassword(doctor: Partial<Prisma.UserCreateInput>) {
        if (doctor?.fName && doctor?.lName) {
            const password = doctor.fName.toLowerCase() + doctor.lName.toLowerCase() + "@123";
            return await bcrypt.hash(password, 10);
        }
        return await bcrypt.hash("@123", 10);
    },
    async createEmployee(req, res) {
        try {
            const body: Employee = req.body;

            const existingUser = await prisma.user.findFirst({
                where: {
                    OR: [{ email: body.email }, { phoneNumber: body.phoneNumber }],
                },
            });

            if (existingUser) {
                return apiError(res, {
                    statusCode: "FORBIDDEN",
                    message: "User with this email or phone already exists",
                    status: 403,
                });
            }

            const existingPhoneUser = await prisma.user.findFirst({
                where: {
                    phoneNumber: body.phoneNumber,
                    isPatient: true,
                },
            });

            if (existingPhoneUser) {
                return apiError(res, {
                    error: "This phone number already exists in our records",
                });
            }

            // Check if email already exists
            const existingEmailUser = await prisma.user.findFirst({
                where: {
                    email: body.email,
                    isPatient: true,
                },
            });

            if (existingEmailUser) {
                return apiError(res, {
                    error: "This email is already registered",
                });
            }
            // Determine generic flags based on role if possible, or default
            // For now, we just create the user and connect the role.
            const hashedPassword = await EmployeeController.generatePassword({
                fName: body.fName,
                lName: body.lName,
            });
            const employee = await prisma.$transaction(async (tx) => {
                const { uniqueId: employeeId } = await generateOrganizationScopedId(tx, "EMPLOYEE");
                
                const newUser = await tx.user.create({
                    data: {
                        fName: body.fName,
                        lName: body.lName,
                        email: body.email,
                        phoneNumber: body.phoneNumber,
                        password: hashedPassword,
                        isPatient: false,
                        isDoctor: body.isDoctor || false,
                        isAdmin: body.isAdmin || false,
                        employeeInfo: {
                            create: {
                                id: employeeId,
                                age: body.age,
                                gender: body.gender,
                                dateOfBirth: body.dateOfBirth,
                                address: body.address,
                                experience: body.experience ? parseInt(body.experience) : 0,
                                salary: body.salary ? parseInt(body.salary) : 0,
                                emergencyContact: body.emergencyContact,
                                emergencyName: body.emergencyName,
                                relationship: body.relationship,
                                additionalCertifications: body.additionalCertifications,
                                highestQualification: body.highestQualification,
                                institutionName: body.institutionName,
                                graduationYear: body.graduationYear,
                                hireDate: body.hireDate,
                                licenseNumber: body.licenseNumber,
                                licenseExpiry: body.licenseExpiry,
                                specialityId: body.specialityId,
                                department: body.department
                                    ? {
                                          connect: [{ name: body.department }],
                                      }
                                    : undefined,
                                qualification: body.highestQualification
                                    ? {
                                          connectOrCreate: [
                                              {
                                                  where: { name: body.highestQualification },
                                                  create: { name: body.highestQualification },
                                              },
                                          ],
                                      }
                                    : undefined,
                            },
                        },
                        roles: body.role
                            ? {
                                  connect: [{ name: body.role }],
                                }
                            : undefined,
                    },
                    include: {
                        employeeInfo: {
                            include: {
                                department: true,
                                qualification: true,
                            },
                        },
                        roles: true,
                    },
                });

                // Create consultation charge price rule if applicable
                if (body.isDoctor && body.consultationCharge !== undefined) {
                    await upsertPriceRule(PriceEntityType.DOCTOR_CONSULTATION, employeeId, Number(body.consultationCharge), {}, tx);
                }

                return newUser;
            });

            // Supplement the response with the price
            if (employee.employeeInfo) {
                // @ts-ignore
                employee.employeeInfo.consultationCharge = await getActivePriceAmount(PriceEntityType.DOCTOR_CONSULTATION, employee.employeeInfo.id);
            }

            return apiSuccess(res, {
                data: employee,
                message: "Employee Created Successfully",
            });
        } catch (error) {
            console.error("Error creating employee:", error);
            return apiError(res, { message: "Failed to create employee." });
        }
    },
    async getAllEmployees(req, res) {
        try {
            const { name, department, role, page = "1", limit = "10" } = req.query;

            const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
            const limitNum = Math.max(1, parseInt(String(limit), 10) || 10);
            const skip = (pageNum - 1) * limitNum;

            let where: any = {
                isPatient: false,
            };

            if (name) {
                const searchTerms = String(name).trim().split(/\s+/);

                if (searchTerms.length === 1) {
                    // Single word search - search in both fields
                    where = {
                        ...where,
                        OR: [{ fName: { contains: searchTerms[0], mode: "insensitive" } }, { lName: { contains: searchTerms[0], mode: "insensitive" } }],
                    };
                } else {
                    // Multi-word search - try to match first word in fName and last word in lName
                    const firstNameTerm = searchTerms[0];
                    const lastNameTerm = searchTerms[searchTerms.length - 1];

                    where = {
                        ...where,
                        AND: [{ fName: { contains: firstNameTerm, mode: "insensitive" } }, { lName: { contains: lastNameTerm, mode: "insensitive" } }],
                    };
                }
            }

            if (department) {
                where = {
                    ...where,
                    employeeInfo: {
                        ...where.employeeInfo,
                        department: {
                            some: {
                                name: { contains: String(department), mode: "insensitive" },
                            },
                        },
                    },
                };
            }
            if (role) {
                where = {
                    ...where,
                    roles: {
                        some: {
                            name: { contains: String(role), mode: "insensitive" },
                        },
                    },
                };
            }

            const [employees, total] = await Promise.all([
                prisma.user.findMany({
                    where: where,
                    select: {
                        id: true,
                        fName: true,
                        lName: true,
                        email: true,
                        phoneNumber: true,
                        isDoctor: true,
                        isAdmin: true,
                        employeeInfo: {
                            select: {
                                id: true,
                                age: true,
                                gender: true,
                                experience: true,
                                salary: true,
                                department: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                                qualification: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                        roles: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                    skip: skip,
                    take: limitNum,
                    orderBy: {
                        createdAt: "desc",
                    },
                }),
                prisma.user.count({
                    where: where,
                }),
            ]);

            const formattedEmployees = await Promise.all(
                employees.map(async (emp) => {
                    if (emp.employeeInfo) {
                        // @ts-ignore
                        emp.employeeInfo.consultationCharge = await getActivePriceAmount(PriceEntityType.DOCTOR_CONSULTATION, emp.employeeInfo.id);
                    }
                    return emp;
                })
            );

            return apiSuccess(res, {
                data: formattedEmployees,
                message: "Employees Fetched Successfully",
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
            console.error("Error fetching employees:", error);
            return apiError(res, { message: "Failed to fetch employees." });
        }
    },

    async getAllEmployeesWithoutPagination(req, res) {
        try {
            const { name } = req.query;
            const referralEmployees = await prisma.referralUsers.findMany({
                where: {
                    referralEmployeeId: { not: null },
                },
                select: {
                    referralEmployeeId: true,
                },
            });
            const existingEmployeeIds = referralEmployees.map((emp) => emp.referralEmployeeId).filter((id) => id !== null) as string[];

            let where: any = {
                isPatient: false,
                employeeInfo: {
                    id: { not: { in: existingEmployeeIds } },
                },
            };

            // Search only by name
            if (name) {
                const searchTerms = String(name).trim().split(/\s+/);

                if (searchTerms.length === 1) {
                    // Single word search - search in both fields
                    where = {
                        ...where,
                        OR: [{ fName: { contains: searchTerms[0], mode: "insensitive" } }, { lName: { contains: searchTerms[0], mode: "insensitive" } }],
                    };
                } else {
                    // Multi-word search - match first word in fName and last word in lName
                    const firstNameTerm = searchTerms[0];
                    const lastNameTerm = searchTerms[searchTerms.length - 1];

                    where = {
                        ...where,
                        AND: [{ fName: { contains: firstNameTerm, mode: "insensitive" } }, { lName: { contains: lastNameTerm, mode: "insensitive" } }],
                    };
                }
            }

            const employees = await prisma.user.findMany({
                where: where,
                select: {
                    id: true,
                    fName: true,
                    lName: true,
                    email: true,
                    phoneNumber: true,
                    isDoctor: true,
                    isAdmin: true,
                    employeeInfo: {
                        select: {
                            id: true,
                            age: true,
                            gender: true,
                            experience: true,
                            salary: true,
                            department: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                            qualification: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                    roles: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            });

            const formattedEmployees = await Promise.all(
                employees.map(async (emp) => {
                    if (emp.employeeInfo) {
                        // @ts-ignore
                        emp.employeeInfo.consultationCharge = await getActivePriceAmount(PriceEntityType.DOCTOR_CONSULTATION, emp.employeeInfo.id);
                    }
                    return {
                        ...emp,
                        fullName: `${emp.fName} ${emp.lName}`,
                        label: `${emp.fName} ${emp.lName}`,
                        value: emp.id,
                    };
                })
            );

            return apiSuccess(res, {
                data: formattedEmployees,
                message: "Employees Fetched Successfully",
                metadata: {
                    totalItems: employees.length,
                },
            });
        } catch (error) {
            console.error("Error fetching employees:", error);
            return apiError(res, { message: "Failed to fetch employees." });
        }
    },
    async getEmployee(req, res) {
        try {
            const { id } = req.params;

            const employee = await prisma.user.findUnique({
                where: { id: id },
                select: {
                    id: true,
                    fName: true,
                    lName: true,
                    email: true,
                    phoneNumber: true,
                    isDoctor: true,
                    isAdmin: true,
                    roles: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    employeeInfo: {
                        include: {
                            department: {
                                include: {
                                    speciality: true,
                                },
                            },
                            qualification: true,
                        },
                        omit: {
                            createdAt: true,
                            updatedAt: true,
                        },
                    },
                },
            });

            if (employee?.employeeInfo) {
                // @ts-ignore
                employee.employeeInfo.consultationCharge = await getActivePriceAmount(PriceEntityType.DOCTOR_CONSULTATION, employee.employeeInfo.id);
            }

            return apiSuccess(res, {
                data: employee,
                message: "Employees Fetched Successfully",
            });
        } catch (error) {
            console.error("Error fetching employees:", error);
            return apiError(res, { message: "Failed to fetch employee." });
        }
    },

    async updateEmployee(req, res) {
        try {
            const { id } = req.params;
            const body = req.body;

            // Check if employee exists
            const existingEmployee = await prisma.user.findUnique({
                where: { id },
                include: { employeeInfo: true },
            });

            if (!existingEmployee) {
                return res.status(404).json({ message: "Employee not found" });
            }

            // Build dynamic update object - only include fields that are provided
            const userUpdateData: any = {};
            const employeeInfoUpdateData: any = {};

            // Only add fields that exist in the request body
            if (body.fName !== undefined) userUpdateData.fName = body.fName;
            if (body.lName !== undefined) userUpdateData.lName = body.lName;
            if (body.email !== undefined) userUpdateData.email = body.email;
            if (body.phoneNumber !== undefined) userUpdateData.phoneNumber = body.phoneNumber;
            if (body.isDoctor !== undefined) userUpdateData.isDoctor = body.isDoctor;
            if (body.isAdmin !== undefined) userUpdateData.isAdmin = body.isAdmin;

            // Employee info updates
            if (body.age !== undefined) employeeInfoUpdateData.age = body.age;
            if (body.gender !== undefined) employeeInfoUpdateData.gender = body.gender;
            if (body.dateOfBirth !== undefined) employeeInfoUpdateData.dateOfBirth = body.dateOfBirth;
            if (body.address !== undefined) employeeInfoUpdateData.address = body.address;
            if (body.experience !== undefined) employeeInfoUpdateData.experience = parseInt(body.experience);
            if (body.salary !== undefined) employeeInfoUpdateData.salary = parseInt(body.salary);
            if (body.emergencyContact !== undefined) employeeInfoUpdateData.emergencyContact = body.emergencyContact;
            if (body.emergencyName !== undefined) employeeInfoUpdateData.emergencyName = body.emergencyName;
            if (body.relationship !== undefined) employeeInfoUpdateData.relationship = body.relationship;
            if (body.additionalCertifications !== undefined) employeeInfoUpdateData.additionalCertifications = body.additionalCertifications;
            if (body.highestQualification !== undefined) employeeInfoUpdateData.highestQualification = body.highestQualification;
            if (body.institutionName !== undefined) employeeInfoUpdateData.institutionName = body.institutionName;
            if (body.graduationYear !== undefined) employeeInfoUpdateData.graduationYear = body.graduationYear;
            if (body.hireDate !== undefined) employeeInfoUpdateData.hireDate = body.hireDate;
            if (body.licenseNumber !== undefined) employeeInfoUpdateData.licenseNumber = body.licenseNumber;
            if (body.licenseExpiry !== undefined) employeeInfoUpdateData.licenseExpiry = body.licenseExpiry;
            if (body.specialityId !== undefined) employeeInfoUpdateData.specialityId = body.specialityId;

            // Handle relations (only if provided)
            if (body.department !== undefined) {
                employeeInfoUpdateData.department = {
                    set: [], // Clear existing connections
                    connect: [{ name: body.department }],
                };
            }

            if (body.highestQualification !== undefined) {
                employeeInfoUpdateData.qualification = {
                    connectOrCreate: [
                        {
                            where: { name: body.highestQualification },
                            create: { name: body.highestQualification },
                        },
                    ],
                };
            }

            // Handle role updates
            if (body.role !== undefined) {
                userUpdateData.roles = {
                    set: [], // Clear existing roles
                    connect: [{ name: body.role }],
                };
            }

            // Build final update object
            const updateData: any = { ...userUpdateData };

            if (Object.keys(employeeInfoUpdateData).length > 0) {
                updateData.employeeInfo = {
                    update: employeeInfoUpdateData,
                };
            }

            // Only perform update if there's something to update
            if (Object.keys(updateData).length === 0) {
                return apiSuccess(res, {
                    data: existingEmployee,
                    message: "No changes provided",
                });
            }

            const employee = await prisma.$transaction(async (tx) => {
                const updated = await tx.user.update({
                    where: { id },
                    data: updateData,
                    include: {
                        employeeInfo: {
                            include: {
                                department: true,
                                qualification: true,
                            },
                        },
                        roles: true,
                    },
                });

                if (body.consultationCharge !== undefined && updated.employeeInfo) {
                    await upsertPriceRule(PriceEntityType.DOCTOR_CONSULTATION, updated.employeeInfo.id, Number(body.consultationCharge), {}, tx);
                }

                return updated;
            });

            if (employee.employeeInfo) {
                // @ts-ignore
                employee.employeeInfo.consultationCharge = await getActivePriceAmount(PriceEntityType.DOCTOR_CONSULTATION, employee.employeeInfo.id);
            }

            return apiSuccess(res, {
                data: employee,
                message: "Employee Updated Successfully",
            });
        } catch (error) {
            console.error("Error updating employee:", error);
            return apiError(res, { message: "Failed to update employee." });
        }
    },
    async deleteEmployee(req, res) {
        try {
            const { id } = req.params;

            const result = await prisma.$transaction(async (tx) => {
                // Delete associated price rules (Consultation charges)
                await deletePrices(PriceEntityType.DOCTOR_CONSULTATION, id, tx);

                const employee = await tx.employeeInfo.delete({
                    where: { id: id },
                });

                const user = await tx.user.delete({
                    where: { id: employee?.userId },
                });

                return { employee, user };
            });

            return apiSuccess(res, {
                data: result.employee,
                message: "Employee Deleted Successfully",
            });
        } catch (error) {
            return apiError(res, { message: "Failed to delete employee." });
        }
    },
};
