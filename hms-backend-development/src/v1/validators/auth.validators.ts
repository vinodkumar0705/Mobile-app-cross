import { z } from "zod";
import { createValidator } from "../utils/createValidator";
import { config } from "dotenv";
config();

const signinSchema = z.object({
    identifier: z.string().min(1, "Identifier is required"),
    password: z.string().min(1, "Password is required"),
});

const signupSchema = z
    .object({
        email: z.string().email("Invalid email").optional(),
        phoneNumber: z.string().min(10, "Phone number must be at least 10 digits").optional(),
        username: z.string().min(1, "Username is required").optional(),
        fName: z.string().min(1, "First name is required"),
        lName: z.string().min(1, "Last name is required"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        config: z.any(),
    })
    .refine((data) => data.email || data.username || data.phoneNumber, {
        message: "At least one of email, username, or phone number is required",
        path: ["email"],
    });

export const AuthValidators = {
    signupValidator: createValidator(signupSchema),
    signinValidator: createValidator(signinSchema),
};
