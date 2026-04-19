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
  type: z.enum(["DISTRIBUTOR"]),
  memberId: z.string().optional().nullable(),
  discountPercent: z.number().min(0).max(100).default(0),
  paymentMethod: z.enum(["cash", "gcash", "card", "bank_transfer", "credit"]),
  notes: z.string().optional(),
  branchId: z.string().min(1),
});

export const createB2BOrderSchema = z.object({
  sellerOrganizationId: z.string().min(1, "Seller organization is required"),
  buyerOrganizationId: z.string().min(1, "Buyer organization is required"),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().optional(),
      productName: z.string().min(1),
      sku: z.string().min(1),
      quantity: z.number().int().min(1),
      unitPrice: z.number().min(0),
    })
  ).min(1, "At least one item is required"),
  discountPercent: z.number().min(0).max(100).default(0),
  paymentMethod: z.enum(["cash", "gcash", "card", "bank_transfer", "credit"]),
  notes: z.string().optional(),
});

export type CreateB2BOrderInput = z.infer<typeof createB2BOrderSchema>;

export type CheckoutInput = z.infer<typeof checkoutSchema>;
