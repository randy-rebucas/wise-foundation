import { z } from "zod";

export const COUPON_CATEGORIES = ["homecare", "cosmetics", "wellness", "scent"] as const;

export const createCouponSchema = z
  .object({
    code: z.string().trim().min(3, "Code must be at least 3 characters").max(30),
    type: z.enum(["percent", "fixed", "free_shipping", "free_item"]),
    value: z.number().min(0).default(0),
    freeItemProductId: z.string().optional(),
    /** Restricts the discount to one product category. Omit/null = applies cart-wide. */
    category: z.enum(COUPON_CATEGORIES).optional().nullable(),
    spinPrizeLabel: z.string().max(200).optional(),
    maxRedemptions: z.number().int().min(1).default(1),
    isActive: z.boolean().default(true),
    expiresAt: z.coerce.date().optional(),
  })
  .refine((data) => data.type !== "percent" || data.value <= 100, {
    message: "Percent value cannot exceed 100",
    path: ["value"],
  })
  .refine((data) => data.type === "free_shipping" || data.value > 0, {
    message: "Value must be greater than 0",
    path: ["value"],
  })
  .refine((data) => data.type !== "free_item" || !!data.freeItemProductId, {
    message: "Select a product for the free item",
    path: ["freeItemProductId"],
  });

export const updateCouponSchema = z.object({
  code: z.string().trim().min(3).max(30).optional(),
  type: z.enum(["percent", "fixed", "free_shipping", "free_item"]).optional(),
  value: z.number().min(0).optional(),
  freeItemProductId: z.string().optional(),
  category: z.enum(COUPON_CATEGORIES).optional().nullable(),
  spinPrizeLabel: z.string().max(200).optional(),
  maxRedemptions: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.coerce.date().optional().nullable(),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
