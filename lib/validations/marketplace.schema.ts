import { z } from "zod";

export const marketplaceShippingSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(6).max(32),
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  region: z.string().min(2).max(100),
  postalCode: z.string().min(3).max(20),
});

export const marketplaceCheckoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional().nullable(),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1)
    .max(50),
  shipping: marketplaceShippingSchema,
  paymentMethod: z.enum(["cash", "gcash", "card", "bank_transfer", "credit"]),
  notes: z.string().max(500).optional(),
});

export type MarketplaceCheckoutInput = z.infer<typeof marketplaceCheckoutSchema>;
