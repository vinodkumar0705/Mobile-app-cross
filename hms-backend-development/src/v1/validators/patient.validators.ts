import z from "zod";
import { createValidator } from "../utils/createValidator";
const stringToDate = z.string().transform((str) => new Date(str));
// Reusable sub-schemas
const validBloodGroups = ["A+", "B+", "AB+", "O+", "A-", "B-", "AB-", "O-", "OTHER"] as const;
const patientInfoSchema = z.object({
    email: z.email().optional().or(z.literal("")),
    phoneNumber: z.string().optional().or(z.literal("")),
    fName: z.string(),
    lName: z.string(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().or(z.literal("")),
    age: z.string(),
    bloodGroup: z.string()
        .optional()
        .or(z.literal(""))
        .refine((value) => !value || (validBloodGroups as readonly string[]).includes(value), {
            message: "Invalid blood group",
        }),
});

export const bookAppointmentSchema = z
    .object({
        // Patient identification — provide patientId (existing) or patientInfo (new)
        patientId: z.string().optional(),
        patientInfo: patientInfoSchema.optional(),

        // Appointment identification — if appointmentId is given, it's a follow-up
        appointmentId: z.string().optional(),
        paidAmount: z.number().optional(),

        sourceAdmissionId: z.string().optional(),

        // Required for new appointments, optional for follow-ups (derived from original)
        doctorId: z.string().optional(),
        appointmentDate: stringToDate.optional(),

        // Always optional
        startTime: stringToDate.optional(),
        endTime: stringToDate.optional(),
        referralInfo: z
            .object({
                referralEmployeeId: z.string().optional(),
                referralId: z.string().optional(),
                referralName: z.string().optional(),
                referralContact: z.string().optional(),
                referralType: z.enum(["INTERNAL", "EXTERNAL", "NONE"]).optional(),
                concessionPercentage: z.number().optional(),
            })
            .optional(),
        reason: z.string().optional().or(z.literal("")),
    })
    // Must have either patientId or patientInfo
    .refine((data) => data.patientId || data.patientInfo, {
        message: "Either patientId or patientInfo must be provided",
        path: ["patientId"],
    })
    // If no appointmentId (not a follow-up), doctorId is required
    .refine((data) => data.appointmentId || data.doctorId, {
        message: "doctorId is required for new appointments",
        path: ["doctorId"],
    })
    // If no appointmentId (not a follow-up), appointmentDate is required
    .refine((data) => data.appointmentId || data.appointmentDate, {
        message: "appointmentDate is required for new appointments",
        path: ["appointmentDate"],
    });

export const addVitalsSchema = z.object({
    patientId: z.string(),
    bp: z.string().optional(),
    bpUnit: z.enum(["mmHg", "kPa"]).optional(),
    pulse: z.string().optional(),
    pulseUnit: z.enum(["bpm"]).optional(),
    spo2: z.string().optional(),
    spo2Unit: z.enum(["%"]).optional(),
    bloodSugar: z.string().optional(),
    bloodSugarUnit: z.enum(["mg/dL", "mmol/L"]).optional(),
    temperature: z.string().optional(),
    temperatureUnit: z.enum(["°F", "°C"]).optional(),
    height: z.string().optional(),
    heightUnit: z.enum(["cm", "inches"]).optional(),
    weight: z.string().optional(),
    weightUnit: z.enum(["kg", "lbs"]).optional(),
    appointmentId: z.string().optional(),
    admissionId: z.string().optional(),
    time: z
        .string()
        .transform((str) => new Date(str))
        .optional(),
});

export const admitPatientSchema = z
    .object({
        patientId: z.string().optional(),
        patientInfo: z
            .object({
                email: z.email().optional().or(z.literal("")),
                phoneNumber: z.string().optional().or(z.literal("")),
                fName: z.string(),
                lName: z.string(),
                gender: z.enum(["MALE", "FEMALE", "OTHER"]),
                age: z.string(),
                bloodGroup: z
                    .string()
                    .optional()
                    .or(z.literal(""))
                    .refine((value) => !value || (validBloodGroups as readonly string[]).includes(value), {
                        message: "Invalid blood group",
                    }),
            })
            .optional(),
        admittingDoctorId: z.string(),
        reason: z.string().optional(),
        admissionDateTime: z
            .string()
            .transform((str) => new Date(str))
            .optional(),
        expectedDischarge: z
            .string()
            .transform((str) => new Date(str))
            .optional(),
        sourceType: z.enum(["DIRECT", "FROM_APPOINTMENT", "FROM_VISIT", "FROM_EMERGENCY"]),
        sourceAppointmentId: z.string().optional(),
        sourceVisitId: z.string().optional(),
        roomId: z.string().optional(),
        roomCharges: z.number().optional(),
        paymentType: z.enum(["CASH", "CARD", "UPI", "OTHER"]).optional(),
        amount: z.string().optional(),
        txnId: z.string().optional(),
        insuranceInfo: z
            .object({
                insuranceProvider: z.string().optional(),
                policyNumber: z.string().optional(),
                policyHolderName: z.string().optional(),
                policyExpiryDate: z
                    .string()
                    .transform((str) => new Date(str))
                    .optional(),
                tpaName: z.string().optional(),
            })
            .optional(),
        emergencyContact: z
            .object({
                name: z.string().optional(),
                contact: z.string().optional(),
                notes: z.string().optional(),
            })
            .optional(),
        referralInfo: z
            .object({
                referralEmployeeId: z.string().optional(),
                referralId: z.string().optional(),
                referralName: z.string().optional(),
                referralContact: z.string().optional(),
                referralType: z.enum(["INTERNAL", "EXTERNAL", "NONE"]).optional(),
                concessionPercentage: z.number().optional(),
            })
            .optional(),
    })
    .refine((data) => data.patientId || data.patientInfo, {
        message: "Either patientId or patientInfo must be provided",
        path: ["patientId"],
    });
export const addVisitSchema = z.object({
    patientId: z.string(),
    doctorId: z.string(),
    diagnosis: z.string(),
    visitDate: z.string().transform((str) => new Date(str)),
    inpatientStaySessionId: z.string().optional(),
    chiefComplaint: z.string().optional(),
    history: z.string().optional(),
    examination: z.string().optional(),
    visitType: z.enum(["GENERAL", "FOLLOW_UP", "EMERGENCY", "IPD_FOLLOWUP", "OPD", "ROUTINE_CHECKUP"]).optional(),
});
export const addPrescriptionSchema = z.object({
    patientId: z.string(),
    doctorId: z.string(),
    prescriptionItems: z.array(
        z.object({
            dosage: z.string(),
            frequency: z.string(),
            duration: z.string(),
            timing: z.string(),
            itemId: z.string(),
        }),
    ),
    notes: z.string().optional(),
    visitId: z.string().optional(),
    appointmentId: z.string().optional(),
    admissionId: z.string().optional(),
});
export const addLabOrderSchema = z.object({
    patientId: z.string(),
    doctorId: z.string(),
    admissionId: z.string().optional(),
    appointmentId: z.string().optional(),
    testIds: z.array(z.string()),
    notes: z.string().optional(),
    orderDate: z
        .string()
        .transform((str) => new Date(str))
        .optional(),
    status: z.enum(["PENDING", "COLLECTED", "PROCESSING", "COMPLETED", "CANCELLED"]).optional(),
});
export const addDietSchema = z.object({
    patientId: z.string(),
    specialInstructions: z.string().optional(),
    dieticianNotes: z.string().optional(),
    dieticianName: z.string().optional(),
    admissionId: z.string().optional(),
    appointmentId: z.string().optional(),
});
export const addPatientMealSchema = z.object({
    patientId: z.string(),
    admissionId: z.string().optional(),
    mealTime: z.string().transform((str) => new Date(str)),
    specialNotes: z.string().optional(),
    foodItems: z
        .array(
            z.object({
                foodItemId: z.string(),
                quantity: z.number().optional(),
            }),
        )
        .optional(),
});
export const addPhysioTherapySchema = z.object({
    patientId: z.string(),
    doctorId: z.string(),
    admissionId: z.string().optional(),
    appointmentId: z.string().optional(),
    physioConfigId: z.string(),
    sessionDate: z.string().transform((str) => new Date(str)),
    notes: z.string().optional(),
});
export const addPatientProcedureSchema = z.object({
    patientId: z.string(),
    admissionId: z.string(),
    surgeryId: z.string(),
    doctors: z.array(z.string()),
    surgeryDate: z.string().transform((str) => new Date(str)),
    externalDoctor: z.string().optional(),
    externalDoctorSpeciality: z.string().optional(),
    diagnosis: z.string().optional(),
    postOperativeNotes: z.string().optional(),
    followUpDate: z
        .string()
        .optional()
        .transform((str) => {
            if (!str || str === "") return undefined;
            return new Date(str);
        }),
    hospitalName: z.string().optional(),
    supportingStaff: z.array(z.string()).optional(),
    status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "RESCHEDULED"]).optional(),
});
export const addTreatmentSchema = z.object({
    patientId: z.string(),
    doctorId: z.string(),
    treatmentConfigId: z.string(),
    admissionId: z.string().optional(),
    appointmentId: z.string().optional(),
    treatmentDate: z.string().transform((str) => new Date(str)),
    externalDoctor: z.string().optional(),
    externalDoctorSpecialty: z.string().optional(),
    diagnosis: z.string().optional(),
    additionalNotes: z.string().optional(),
    medications: z.string().optional(),
    status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "RESCHEDULED", "DISCONTINUED"]).optional(),
});

export const makeOutPatientToInPatientSchema = z.object({
    doctorId: z.string().optional(),
    roomId: z.string(),
    reason: z.string().optional(),
    admissionDateTime: z
        .string()
        .transform((str) => new Date(str))
        .optional(),
    expectedDischarge: z
        .string()
        .transform((str) => new Date(str))
        .optional(),
    insuranceInfo: z
        .object({
            insuranceProvider: z.string().optional(),
            policyNumber: z.string().optional(),
            policyHolderName: z.string().optional(),
            policyExpiryDate: z
                .string()
                .transform((str) => new Date(str))
                .optional(),
            tpaName: z.string().optional(),
        })
        .optional(),
    emergencyContact: z
        .object({
            name: z.string().optional(),
            contact: z.string().optional(),
            notes: z.string().optional(),
        })
        .optional(),
    referralInfo: z
        .object({
            referralEmployeeId: z.string().optional(),
            referralId: z.string().optional(),
            referralName: z.string().optional(),
            referralContact: z.string().optional(),
            referralType: z.enum(["INTERNAL", "EXTERNAL", "NONE"]).optional(),
            concessionPercentage: z.number().optional(),
        })
        .optional(),
});

export const PatientValidator = {
    BookAppointmentValidator: createValidator(bookAppointmentSchema),
    AddVitalsValidator: createValidator(addVitalsSchema),
    AdmitPatientValidator: createValidator(admitPatientSchema),
    AddVisitValidator: createValidator(addVisitSchema),
    AddPrescriptionValidator: createValidator(addPrescriptionSchema),
    AddLabOrderValidator: createValidator(addLabOrderSchema),
    AddDietValidator: createValidator(addDietSchema),
    AddPatientMealValidator: createValidator(addPatientMealSchema),
    AddPhysioTherapyValidator: createValidator(addPhysioTherapySchema),
    AddPatientProcedureValidator: createValidator(addPatientProcedureSchema),
    AddTreatmentValidator: createValidator(addTreatmentSchema),
    MakeOutPatientToInPatientValidator: createValidator(makeOutPatientToInPatientSchema),
};
