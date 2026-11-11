import z from "zod";
import { createValidator } from "../utils/createValidator";

export const medicalItemSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    itemType: z.enum([
        "MEDICINE",
        "MEDICAL_SUPPLY",
        "SURGICAL_SUPPLY",
        "DIAGNOSTIC_SUPPLY",
        "CONSUMABLE",
        "EQUIPMENT",
        "INSTRUMENT",
        "DISPOSABLE",
        "INJECTABLE",
        "IV_FLUID",
        "DRESSING",
        "TABLET",
        "CAPSULE",
        "SYRUP",
        "INJECTION",
        "OINTMENT",
        "CREAM",
        "LOTION",
        "POWDER",
        "GRANULES",
        "DROPS",
        "INHALER",
        "SPRAY",
        "SUPPOSITORY",
        "PATCH",
        "GEL",
        "PASTE",
        "WIPE",
        "TAMPON",
        "PAD",
        "BANDAGE",
        "GAUZE",
        "ADHESIVE_TAPE",
        "GLOVES",
        "SYRINGE",
        "CATHETER",
        "STENT",
        "IMPLANT",
        "PROSTHESIS",
        "ORTHOTIC",
        "BRACE",
        "CRUTCHES",
        "WHEELCHAIR",
        "OXYGEN_CYLINDER",
        "VENTILATOR",
        "MONITOR",
    ]),
    unit: z.string().min(1, "Unit is required"),
    strength: z.string().optional(),
    dosageForm: z.string().optional(),
    genericName: z.string().optional(),
    brand: z.string().optional(),
    isActive: z.boolean().optional().default(true),
    hasExpiry: z.boolean().optional().default(true),
    requiresColdChain: z.boolean().optional().default(false),
    isControlled: z.boolean().optional().default(false),
});
export const updateMedicalItemSchema = medicalItemSchema.partial();

export const batchSchema = z.object({
    itemId: z.string().min(1, "Service item is required"),
    batchNumber: z.string().min(1, "Batch number is required"),
    mfgDate: z
        .string()
        .optional()
        .transform((str) => (str ? new Date(str) : undefined)),
    expiryDate: z
        .string()
        .optional()
        .transform((str) => (str ? new Date(str) : undefined)),
    purchaseDate: z
        .string()
        .optional()
        .transform((str) => (str ? new Date(str) : new Date())),
    quantity: z.number().int().min(0, "Quantity must be at least 0"),
    sellingPrice: z.number().optional(),
    costPrice: z.number().optional(),
    unitsPerStrip: z.number().int().optional(),
    mrp: z.number().optional(),
    supplier: z.string().optional(),
    isActive: z.boolean().optional().default(true),
});

export const dispensationSchema = z.object({
    batchId: z.string().min(1, "Batch ID is required"),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
    pharmacistId: z.string().optional(),
    prescriptionId: z.string().optional(),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    unitsPerStrip: z.number().int().optional(),
    sellingPrice: z.number().min(0),
    totalAmount: z.number().min(0),
    discount: z.number().optional(),
    status: z.enum(["PENDING", "COMPLETED"]).optional().default("COMPLETED"),
});

export const stockAdjustmentSchema = z.object({
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
    type: z.enum(["ADD", "REMOVE"]),
    reason: z.string().optional(),
});

export const updateBatchSchema = z.object({
    batchNumber: z.string().min(1, "Batch number is required").optional(),
    mfgDate: z
        .string()
        .optional()
        .nullable()
        .transform((str) => (str ? new Date(str) : undefined)),
    expiryDate: z
        .string()
        .optional()
        .nullable()
        .transform((str) => (str ? new Date(str) : undefined)),
    purchaseDate: z
        .string()
        .optional()
        .nullable()
        .transform((str) => (str ? new Date(str) : undefined)),
    sellingPrice: z.number().optional(),
    costPrice: z.number().optional(),
    unitsPerStrip: z.number().int().optional(),
    mrp: z.number().optional(),
    supplier: z.string().optional(),
    isActive: z.boolean().optional(),
});

export const billSchema = z.object({
    patientId: z.string().optional(),
    patientName: z.string().optional(),
    patientPhone: z.string().optional(),
    txId: z.string().optional(),
    paymentType: z.enum(["CASH", "CARD", "UPI", "OTHER"]).optional(),
    discount: z.coerce.number().optional(),
    adjustments: z.array(z.object({
            type: z.enum(["DISCOUNT", "WAIVER", "EXTRA_CHARGE"]),
            mode: z.enum(["PERCENTAGE", "FIXED"]),
            value: z.number().min(0),
            reason: z.string().optional()
        })).optional().default([]),
    items: z.array(
        z.object({
            itemId: z.string().min(1, "Item ID is required"),
            batchId: z.string().min(1, "Batch ID is required"),
            quantity: z.number().int().min(1, "Quantity must be at least 1"),
            sellingPrice: z.number().min(0, "Unit price must be at least 0"),
            totalAmount: z.number().min(0, "Total amount must be at least 0"),
        }),
    ),
});

export const recordPaymentSchema = z.object({
    amount: z.number().positive("Amount must be positive"),
    paymentMethod: z.enum(["CASH", "CARD", "UPI", "OTHER"]),
    type: z.enum(["PAYMENT", "REFUND", "ADVANCE"]).default("PAYMENT"),
    txId: z.string().optional(),
    notes: z.string().optional(),
});

export const PharmacyValidator = {
    MedicalItemValidator: createValidator(medicalItemSchema),
    BatchValidator: createValidator(batchSchema),
    UpdateBatchValidator: createValidator(updateBatchSchema),
    DispensationValidator: createValidator(dispensationSchema),
    StockAdjustmentValidator: createValidator(stockAdjustmentSchema),
    BillValidator: createValidator(billSchema),
    RecordPaymentValidator: createValidator(recordPaymentSchema),
};
