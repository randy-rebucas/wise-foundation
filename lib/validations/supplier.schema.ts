import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required").max(200).trim(),
  contactPerson: z.string().max(200).trim().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(50).trim().optional(),
  address: z.string().max(500).trim().optional(),
  notes: z.string().max(1000).trim().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
