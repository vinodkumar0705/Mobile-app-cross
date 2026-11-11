import z from "zod";
import { completeConsultationSchema } from "../validators/doctor.validator";

export type completeConsultationType = z.infer<typeof completeConsultationSchema>;
