import { z } from "zod";

export const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  variantId: z.string().optional(),
  productName: z.string().min(1),
  sku: z.string().min(1),
  quantity: z.number().int().positive("Quantity must be positive"),
  unitCost: z.number().min(0, "Unit cost must be non-negative"),
});

export const createPurchaseOrderSchema = z.object({
  organizationId: z.string().min(1, "Organization is required"),
  branchId: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, "At least one item is required"),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
});

export const updatePurchaseOrderSchema = z.object({
  items: z.array(purchaseOrderItemSchema).min(1).optional(),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
});

export const receivePurchaseOrderSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string().min(1),
      receivedQuantity: z.number().int().min(0),
    })
  ),
  notes: z.string().optional(),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderSchema>;

export const signPurchaseOrderSchema = z.object({
  role: z.enum(["submit", "approve"]),
  signedByName: z.string().trim().min(1, "Signer name is required").max(120),
  signatureDataUrl: z
    .string()
    .min(1, "Signature is required")
    .refine(
      (v) => /^data:image\/(png|jpeg|jpg);base64,/i.test(v.trim()),
      "Invalid signature image"
    ),
});

export type SignPurchaseOrderInput = z.infer<typeof signPurchaseOrderSchema>;
