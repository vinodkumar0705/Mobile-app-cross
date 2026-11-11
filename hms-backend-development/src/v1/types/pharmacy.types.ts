import z from "zod";
import { billSchema, medicalItemSchema, updateBatchSchema, updateMedicalItemSchema } from "../validators/pharmacy.validators";

export type billType = z.infer<typeof billSchema>;
export type UpdateMedicalItem = z.infer<typeof updateMedicalItemSchema>;
export type UpdateBatch = z.infer <typeof updateBatchSchema>