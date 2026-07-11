import { z } from "zod";
import { parseImageUrl } from "@/lib/utils/imageUrl";

const mediaUrlSchema = z
  .string()
  .trim()
  .refine((s) => parseImageUrl(s) !== null, "Must be a valid http(s) URL or /uploads/ path")
  .transform((s) => parseImageUrl(s)!);

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined));

const adBaseSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  creativeType: z.enum(["image", "video"]),
  creativeUrl: mediaUrlSchema,
  posterUrl: mediaUrlSchema.optional(),
  headline: optionalText(120),
  caption: optionalText(240),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
});

export const createAdSchema = adBaseSchema.refine(
  (data) => !data.startsAt || !data.endsAt || data.startsAt < data.endsAt,
  { message: "Start date must be before end date", path: ["endsAt"] }
);

export const updateAdSchema = adBaseSchema.partial();

export type CreateAdInput = z.infer<typeof createAdSchema>;
export type UpdateAdInput = z.infer<typeof updateAdSchema>;
