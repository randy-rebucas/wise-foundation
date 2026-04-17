import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["TENANT_OWNER", "BRANCH_MANAGER", "STAFF", "INVENTORY_MANAGER", "MEMBER"]),
  branchIds: z.array(z.string()).default([]),
  phone: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(["TENANT_OWNER", "BRANCH_MANAGER", "STAFF", "INVENTORY_MANAGER", "MEMBER"]).optional(),
  branchIds: z.array(z.string()).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
