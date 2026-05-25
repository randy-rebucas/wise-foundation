import { z } from "zod";

/**
 * Shared password complexity rule used for both staff and customer signup.
 * Rules: 8–72 chars, at least one uppercase, one lowercase, one digit or symbol.
 * 72-char max matches bcrypt's effective input limit.
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .refine((p) => /[A-Z]/.test(p), "Password must contain at least one uppercase letter")
  .refine((p) => /[a-z]/.test(p), "Password must contain at least one lowercase letter")
  .refine(
    (p) => /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p),
    "Password must contain at least one number or special character"
  );
