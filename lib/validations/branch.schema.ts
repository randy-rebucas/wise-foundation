import { z } from "zod";

export const createBranchSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  code: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Za-z0-9]+$/, "Code must be alphanumeric"),
  address: z.string().min(5, "Address is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  isHeadOffice: z.boolean().default(false),
});

export const updateBranchSchema = createBranchSchema.partial();

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
