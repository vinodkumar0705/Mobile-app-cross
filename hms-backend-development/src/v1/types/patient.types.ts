import z from "zod";
import { bookAppointmentSchema, admitPatientSchema, makeOutPatientToInPatientSchema } from "../validators/patient.validators";

export type BookAppointment = z.infer<typeof bookAppointmentSchema>;
export type AdmitPatient = z.infer<typeof admitPatientSchema>;
export type MakeOutPatientToInPatient = z.infer<typeof makeOutPatientToInPatientSchema>;
