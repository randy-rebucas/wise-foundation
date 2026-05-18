import { z } from "zod";

export const wishlistItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().nullable(),
  slug: z.string().min(1),
  name: z.string().min(1),
  variantName: z.string().optional(),
  sku: z.string().min(1),
  price: z.number().min(0),
  image: z.string().optional(),
});

export const savedAddressSchema = z.object({
  label: z.string().min(1).max(40),
  fullName: z.string().min(2).max(100),
  phone: z.string().min(6).max(30),
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2).max(80),
  region: z.string().min(2).max(80),
  postalCode: z.string().min(3).max(20),
  isDefault: z.boolean().optional(),
});

export const paymentMethodSchema = z.object({
  type: z.enum(["card", "gcash", "bank_transfer"]),
  label: z.string().min(1).max(80),
  last4: z.string().max(4).optional(),
  isDefault: z.boolean().optional(),
});

export const customerReviewSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  productSlug: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(10).max(2000),
});
