import { z } from "zod";
import { createValidator } from "../utils/createValidator";

export const organizationSchema = z.object({
    brandName: z.string().min(1, "Name is required"),
    legalName: z.string().min(1, "Name is required"),
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional().default("ACTIVE"),
    organizationLogo: z.string().optional(),
    licenseNumber: z.string().optional(),
    licenseExpiryDate: z
        .string()
        .transform((str) => new Date(str))
        .optional(),
    establishmentDate: z
        .string()
        .transform((str) => new Date(str))
        .optional(),
    taxIdentificationNumber: z.string().optional(),
    registeredAddress: z.string().optional(),
    autherizedAdmininstitorName: z.string().optional(),
    officialEmail: z.string().optional(),
    officialPhoneNumber: z.string().optional(),
    organizationTagline: z.string().optional(),
    opdStartTime: z.string().optional(),
    opdEndTime: z.string().optional(),
    opdDuration: z.string().optional(),
    patientIdPrefix: z.string().optional(),
    employeeIdPrefix: z.string().optional(),
    idLength: z.number().optional(),
    consultationSpan: z.coerce.number().optional().default(15),
    consultationAttempts: z.coerce.number().optional().default(1),
});

export const branchSchema = z.object({
    name: z
        .string()
        .min(1, "Branch name is required")
        .max(100, "Branch name must be less than 100 characters")
        .regex(/^[a-zA-Z0-9@_\-() ]*$/, "Branch name contains invalid characters"),

    city: z
        .string()
        .min(1, "City is required")
        .max(100, "City name must be less than 100 characters")
        .regex(/^[a-zA-Z0-9@_\-() ]*$/, "City name contains invalid characters"),

    address: z
        .string()
        .min(1, "Address is required")
        .max(500, "Address must be less than 500 characters")
        .regex(/^[a-zA-Z0-9@,./_\-() ]*$/, "Address contains invalid characters"),

    phoneNumber: z
        .string()
        .min(1, "Phone number is required")
        .regex(/^[\d\s\-+()]+$/, "Please enter a valid phone number"),

    email: z.string().email("Please enter a valid email address").or(z.literal("")).optional(),

    managerName: z.string().optional(),
    organizationId: z.string().min(1, "Organization ID is required"),
});

export const buildingSchema = z.object({
    name: z.string().min(1, "Building name is required"),
    branchId: z.string().min(1, "Branch ID is required"),
    buildingCode: z.string().optional(),
    numberOfFloors: z.number().int().positive("Number of floors must be positive").optional(),
});

export const floorSchema = z.object({
    name: z.string().min(1, "Floor name is required"),
    buildingId: z.string().min(1, "Building ID is required"),
});

export const roomTypeSchema = z.object({
    name: z.string().min(1, "Room Type name is required"),
    price: z.number(),
    description: z.string().optional(),
});

export const amenitySchema = z.object({
    name: z.string().min(1, "Amenity name is required"),
    icon: z.string().optional(),
    description: z.string().optional(),
});

export const roomSchema = z.object({
    floorId: z.string().min(1, "Floor ID is required"),
    roomTypeId: z.string().min(1, "Room Type ID is required"),
    roomNumber: z.string().min(1, "Room Number is required"),
    status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE"]).optional().default("AVAILABLE"),
    name: z.string().min(1, "Name is required").optional(),
    capacity: z.number().int().min(1, "Capacity must be at least 1").optional(),
    currentOccupancy: z.number().int().optional(),
    equipment: z.array(z.string()).optional(),
    isWheelchairAccessible: z.boolean().optional().default(true),
    isAvailable: z.boolean().optional(),
    description: z.string().optional(),
    notes: z.string().optional(),
    amenities: z
        .array(z.string())
        .optional()
        .transform((ids) => (ids ? { connect: ids.map((id) => ({ id })) } : undefined)),
});

export const departmentSchema = z.object({
    name: z.string().min(1, "Department name is required"),
    departmentCode: z.string().optional(),
    medicalSpecialty: z.string().optional(),
    description: z.string().optional(),
    headDoctor: z.string().optional(),
    patientCapacity: z.number().int().positive("Patient capacity must be positive").optional(),
    contactEmail: z.string().email("Invalid email format").optional(),
    contactPhone: z.string().optional(),
    location: z.string().optional(),
    departmentType: z.string().optional(),
    status: z.string().optional(),
});
export const specialitySchema = z.object({
    name: z.string().min(1, "Speciality name is required"),
    departmentId: z.string().min(1, "departmentId is required"),
    description: z.string().optional(),
});
export const surgerySchema = z.object({
    name: z.string().min(1, "Surgery name is required"),
    description: z.string().optional(),
    duration: z.string().optional(),
    price: z.string().optional(),
    status: z.string().optional(),
    isActive: z.boolean().optional(),
});
export const treatmentConfigurationSchema = z.object({
    name: z.string().min(1, "Treatment name is required"),
    description: z.string().optional(),
    price: z.number().optional(),
    status: z.string().optional(),
    isActive: z.boolean().optional(),
});
export const physioConfigurationSchema = z.object({
    name: z.string().min(1, "Physio Therapy name is required"),
    description: z.string().optional(),
    status: z.string().optional(),
    duration: z.number().optional(),
    price: z.number().optional(),
    time: z.string().optional(),
    sets: z.number().optional(),
    reps: z.number().optional(),
    difficultyLevel: z.string().optional(),
    isActive: z.boolean().optional(),
});
export const labConfigurationSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    category: z.enum(["BLOOD", "URINE", "IMAGING", "CARDIAC", "PATHOLOGY", "MICROBIOLOGY", "OTHER"]).optional(),
    price: z.string().optional(),
    duration: z.string().optional(),
    preparationInstructions: z.string().optional(),
    reportType: z.enum(["NUMERIC", "TEXT", "RANGE", "IMAGE", "MULTIPLE"]).optional(),
    isActive: z.boolean().optional(),
    parameters: z
        .object({
            create: z
                .array(
                    z.object({
                        name: z.string(),
                        unit: z.string().optional(),
                        normalRange: z.string().optional(),
                        isCritical: z.boolean().optional().default(false),
                    }),
                )
                .optional(),
            update: z
                .array(
                    z.object({
                        id: z.string(),
                        name: z.string().optional(),
                        unit: z.string().optional(),
                        normalRange: z.string().optional(),
                        isCritical: z.boolean().optional(),
                    }),
                )
                .optional(),
            delete: z.array(z.string()).optional(),
            upsert: z
                .array(
                    z.object({
                        where: z.object({ id: z.string() }),
                        create: z.object({
                            name: z.string(),
                            unit: z.string().optional(),
                            normalRange: z.string().optional(),
                            isCritical: z.boolean().optional().default(false),
                        }),
                        update: z.object({
                            name: z.string().optional(),
                            unit: z.string().optional(),
                            normalRange: z.string().optional(),
                            isCritical: z.boolean().optional(),
                        }),
                    }),
                )
                .optional(),
        })
        .optional(),
});

export const referralUsersSchema = z.object({
    referralEmployeeId: z.string().optional(),
    referralName: z.string().optional(),
    referralContact: z.string().optional(),
    referralType: z.enum(["INTERNAL", "EXTERNAL", "NONE"]).optional(),
    concessionPercentage: z.number().optional(),
    placeOfWork: z.string().optional(),
    occupation: z.string().optional(),
});

export const OrganizationValidator = {
    validateOrganization: createValidator(organizationSchema),
    validateBranch: createValidator(branchSchema),
    validateBuilding: createValidator(buildingSchema),
    validateFloor: createValidator(floorSchema),
    validateRoomType: createValidator(roomTypeSchema),
    validateRoom: createValidator(roomSchema),
    validateDepartment: createValidator(departmentSchema),
    validateAmenity: createValidator(amenitySchema),
    validateSurgery: createValidator(surgerySchema),
    validateTreatment: createValidator(treatmentConfigurationSchema),
    validatePhysio: createValidator(physioConfigurationSchema),
    validatelabConfiguration: createValidator(labConfigurationSchema),
    validateReferralUsers: createValidator(referralUsersSchema),
};
