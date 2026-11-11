import { z } from "zod";

const signinSchema = z.object({
  identifier: z.string().min(1, "Identifier is required"),
  password: z.string().min(1, "Password is required"),
});

const res1 = signinSchema.safeParse({ identifier: "vikram.reddy@example.com", password: "vikramreddy@123" });
console.log("SafeParse email result:", res1.success, res1.success ? res1.data : res1.error);
