import { z } from "zod";

export const stockMovementSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  variantId: z.string().optional(),
  type: z.enum(["IN", "OUT", "TRANSFER", "ADJUSTMENT"]),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  unitCost: z.number().min(0).optional(),
  toBranchId: z.string().transform((v) => v || undefined).optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const orgTransferSchema = z.object({
  fromOrganizationId: z.string().min(1, "Source organization is required"),
  toOrganizationId: z.string().min(1, "Destination organization is required"),
  productId: z.string().min(1, "Product is required"),
  variantId: z.string().optional(),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const updateThresholdSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  lowStockThreshold: z.number().int().min(0),
});

export type StockMovementInput = z.infer<typeof stockMovementSchema>;
export type OrgTransferInput = z.infer<typeof orgTransferSchema>;
export type UpdateThresholdInput = z.infer<typeof updateThresholdSchema>;
