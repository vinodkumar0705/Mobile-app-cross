import z from "zod";
import { createValidator } from "../utils/createValidator";

export const employeeSchema = z.object({
    // Personal Information
    fName: z.string().min(1, "First name must be at least 1 characters").max(50, "First name cannot exceed 50 characters"),
    lName: z.string().min(1, "Last name must be at least 1 characters").max(50, "Last name cannot exceed 50 characters"),
    email: z.string().email("Please enter a valid email address"),
    phoneNumber: z.string().regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/, "Please enter a valid phone number"),
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    age: z.string().optional(),
    address: z.string().optional(),
    isDoctor: z.boolean().optional(),
    isPatient: z.boolean().optional(),
    isAdmin: z.boolean().optional(),
    specialityId: z.string().min(1, "Please select a speciality").optional(),
    consultationCharge: z.string().optional(),

    // Professional Details
    role: z.string().min(1, "Please select a role"),
    department: z.string().min(1, "Please select a department"),
    specialization: z.string().optional(),
    experience: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 50, {
        message: "Years of experience must be between 0 and 50",
    }),
    licenseNumber: z.string().optional(),
    licenseExpiry: z.string().optional(),
    hireDate: z.string().optional(),
    salary: z.string().optional(),

    // Education & Qualifications
    highestQualification: z.string().min(2, "Please enter your highest qualification"),
    institutionName: z.string().min(2, "Please enter your institution name"),
    graduationYear: z.string().refine(
        (val) => {
            const year = Number(val);
            const currentYear = new Date().getFullYear();
            return !isNaN(year) && year >= 1950 && year <= currentYear;
        },
        {
            message: `Graduation year must be between 1950 and ${new Date().getFullYear()}`,
        },
    ),
    additionalCertifications: z.string().optional(),

    // Emergency Contact
    emergencyName: z.string().min(2, "Please enter emergency contact name"),
    emergencyContact: z.string().regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/, "Please enter a valid emergency contact number"),
    relationship: z.string().min(2, "Please enter relationship"),
});
export const employeeValidator = {
    createEmployee: createValidator(employeeSchema),
};
