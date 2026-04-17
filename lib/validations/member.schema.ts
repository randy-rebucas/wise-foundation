import { z } from "zod";

export const createMemberSchema = z.object({
  name: z.string().min(2, "Name is required").max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(7, "Phone number is required"),
  address: z.string().optional(),
  discountPercent: z.number().min(0).max(100).default(10),
  branchId: z.string().min(1, "Branch is required"),
});

export const updateMemberSchema = createMemberSchema
  .omit({ branchId: true })
  .extend({
    status: z.enum(["active", "inactive", "suspended"]).optional(),
  })
  .partial();

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
