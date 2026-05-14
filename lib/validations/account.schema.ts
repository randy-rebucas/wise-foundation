import { z } from "zod";

export const registerCustomerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterCustomerInput = z.infer<typeof registerCustomerSchema>;
