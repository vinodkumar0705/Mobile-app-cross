import z from "zod";
import { employeeSchema } from "../validators/employee.validator";

export type Employee = z.infer<typeof employeeSchema>;