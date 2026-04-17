import { z } from "zod";

export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        variantId: z.string().optional().nullable(),
        name: z.string(),
        sku: z.string(),
        price: z.number().min(0),
        quantity: z.number().int().min(1),
        maxStock: z.number(),
        image: z.string().optional(),
      })
    )
    .min(1, "Cart is empty"),
  memberId: z.string().optional().nullable(),
  discountPercent: z.number().min(0).max(100).default(0),
  paymentMethod: z.enum(["cash", "gcash", "card", "bank_transfer", "credit"]),
  amountPaid: z.number().min(0),
  notes: z.string().optional(),
  branchId: z.string().min(1, "Branch is required"),
});

export const createBulkOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      variantId: z.string().optional().nullable(),
      quantity: z.number().int().min(1),
      unitPrice: z.number().min(0),
    })
  ).min(1),
  type: z.enum(["BULK", "DISTRIBUTOR"]),
  memberId: z.string().optional().nullable(),
  discountPercent: z.number().min(0).max(100).default(0),
  paymentMethod: z.enum(["cash", "gcash", "card", "bank_transfer", "credit", "credit"]),
  notes: z.string().optional(),
  branchId: z.string().min(1),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
