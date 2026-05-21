import { z } from "zod";
import {
  PURCHASE_ORDER_PAYMENT_TERMS_MONTHS,
  PURCHASE_ORDER_PAYMENT_TERMS_WEEKLY,
} from "@/lib/utils/purchaseOrderTotals";

const paymentTermsMonthsSchema = z
  .union([z.literal(3), z.literal(6), z.literal(PURCHASE_ORDER_PAYMENT_TERMS_WEEKLY)])
  .nullable()
  .optional();

export const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  variantId: z.string().optional(),
  productName: z.string().min(1),
  sku: z.string().min(1),
  quantity: z.number().int().positive("Quantity must be positive"),
  unitCost: z.number().min(0, "Unit cost must be non-negative"),
});

export const purchaseOrderDiscountPercentSchema = z
  .number()
  .min(0, "Discount cannot be negative")
  .max(100, "Discount cannot exceed 100%");

export const createPurchaseOrderSchema = z.object({
  organizationId: z.string().min(1, "Organization is required"),
  branchId: z.string().optional(),
  title: z.string().trim().max(200, "Title must be 200 characters or less").optional(),
  items: z.array(purchaseOrderItemSchema).min(1, "At least one item is required"),
  paymentTermsMonths: paymentTermsMonthsSchema,
  discountPercent: purchaseOrderDiscountPercentSchema.optional(),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
});

export const updatePurchaseOrderSchema = z.object({
  organizationId: z.string().min(1, "Organization is required").optional(),
  title: z.string().trim().max(200, "Title must be 200 characters or less").optional(),
  items: z.array(purchaseOrderItemSchema).min(1).optional(),
  paymentTermsMonths: paymentTermsMonthsSchema,
  discountPercent: purchaseOrderDiscountPercentSchema.optional(),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
});

export { PURCHASE_ORDER_PAYMENT_TERMS_MONTHS, PURCHASE_ORDER_PAYMENT_TERMS_WEEKLY };

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

export const declinePurchaseOrderSchema = z.object({
  reason: z.string().trim().max(500, "Reason must be 500 characters or less").optional(),
});

export type DeclinePurchaseOrderInput = z.infer<typeof declinePurchaseOrderSchema>;
