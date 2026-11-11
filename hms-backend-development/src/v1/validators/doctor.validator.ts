import z from "zod";
import { createValidator } from "../utils/createValidator";

export const completeConsultationSchema = z.object({
    vitals: z.object({
        temperature: z.string().min(1, "Temperature is required").optional().or(z.literal("")),
        bp: z.string().min(1, "BP is required").optional().or(z.literal("")),
        pulse: z.string().min(1, "Pulse is required").optional().or(z.literal("")),
        spo2: z.string().min(1, "SPO2 is required").optional().or(z.literal("")),
        bloodSugar: z.string().min(1, "Blood Sugar is required").optional().or(z.literal("")),
        weight: z.string().min(1, "Weight is required").optional().or(z.literal("")),
        height: z.string().min(1, "Height is required").optional().or(z.literal("")),

        temperatureUnit: z.string().min(1, "Unit is required").optional(),
        bpUnit: z.string().min(1, "Unit is required").optional(),
        pulseUnit: z.string().min(1, "Unit is required").optional(),
        spo2Unit: z.string().min(1, "Unit is required").optional(),
        bloodSugarUnit: z.string().min(1, "Unit is required").optional(),
        weightUnit: z.string().min(1, "Unit is required").optional(),
        heightUnit: z.string().min(1, "Unit is required").optional(),
    }),
    prescription: z.array(
        z
            .object({
                itemId: z.preprocess((val) => (val === null || val === undefined || val === "" ? undefined : String(val)), z.string().min(1).optional()),
                customMedicineName: z.preprocess((val) => (val === null || val === undefined || val === "" ? undefined : String(val)), z.string().min(1).optional()),
                dosage: z.string().min(1, "Dosage is required").optional().or(z.literal("")),
                frequency: z.string().min(1, "Frequency is required").optional().or(z.literal("")),
                duration: z.string().min(1, "Duration is required").optional().or(z.literal("")),
                timing: z.string().min(1, "Timing is required").optional().or(z.literal("")),
            })
            .refine((data) => Boolean(data.itemId) || Boolean(data.customMedicineName?.trim()), {
                message: "Each prescription line must have a selected medicine (itemId) or a custom medicine name",
                path: ["itemId"],
            }),
    ),
    discount: z.coerce.number().min(0, "Discount is required").optional(),
    chiefComplaint: z.string().min(1, "Chief Complaint is required"),
    examination: z.string().min(1, "Examination is required").optional().or(z.literal("")),
    diagnosis: z.string().min(1, "Diagnosis is required").optional().or(z.literal("")),
    isAdmissionRecommended: z.boolean(),
    testReportsToCarry: z.string().optional().or(z.literal("")),
    nextReviewDate: z.string().optional().or(z.literal("")),
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
export const addVisitSchema = z.object({
    patientId: z.string(),
    doctorId: z.string().optional(),
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
    prescriptionItems: z.array(
        z.object({
            itemId: z.string(),
            dosage: z.string(),
            frequency: z.string(),
            duration: z.string(),
            timing: z.string(),
        }),
    ),
    notes: z.string().optional(),
    visitId: z.string().optional(),
    appointmentId: z.string().optional(),
    admissionId: z.string().optional(),
});
export const addLabOrderSchema = z.object({
    patientId: z.string(),
    testIds: z.array(z.string()),
    admissionId: z.string().optional(),
    appointmentId: z.string().optional(),
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
    admissionId: z.string().optional(),
    appointmentId: z.string().optional(),
    physioConfigId: z.string(),
    doctorId: z.string().optional(),
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
    treatmentConfigId: z.string(),
    doctorId: z.string().optional(),
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
export const DoctorValidator = {
    completeConsultation: createValidator(completeConsultationSchema),
    addVitals: createValidator(addVitalsSchema),
    addVisit: createValidator(addVisitSchema),
    addPrescription: createValidator(addPrescriptionSchema),
    addLabOrder: createValidator(addLabOrderSchema),
    addDiet: createValidator(addDietSchema),
    addPatientMeal: createValidator(addPatientMealSchema),
    addPhysioTherapy: createValidator(addPhysioTherapySchema),
    addPatientProcedure: createValidator(addPatientProcedureSchema),
    addTreatment: createValidator(addTreatmentSchema),
};
