import { z } from "zod";

export const patchAppSettingsSchema = z.object({
  appName: z.string().min(1).max(100).optional(),
  appTagline: z.string().max(120).optional(),
  currency: z.string().min(3).max(10).optional(),
  timezone: z.string().min(1).max(64).optional(),
  memberDefaultDiscountPercent: z.number().min(0).max(100).optional(),
  defaultLowStockThreshold: z.number().int().min(1).max(999_999).optional(),
  receiptFooter: z.string().max(500).optional(),
  marketplaceFulfillmentBranchId: z
    .union([z.string().regex(/^[a-f\d]{24}$/i), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === null ? null : v)),
});

export type PatchAppSettingsInput = z.infer<typeof patchAppSettingsSchema>;
