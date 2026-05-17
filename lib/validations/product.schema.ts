import { z } from "zod";
import { MAX_GALLERY_IMAGES } from "@/lib/constants/gallery";
import { parseImageUrl } from "@/lib/utils/imageUrl";

const imageUrlSchema = z
  .string()
  .trim()
  .refine(
    (s) => parseImageUrl(s) !== null,
    "Each image must be a valid http(s) URL or /uploads/ path"
  )
  .transform((s) => parseImageUrl(s)!);

export const createProductSchema = z.object({
  name: z.string().min(2, "Name is required").max(200),
  description: z.string().optional(),
  category: z.enum(["homecare", "cosmetics", "wellness", "scent"]),
  sku: z.string().min(1, "SKU is required").max(50),
  barcode: z.string().optional(),
  retailPrice: z.number().min(0, "Price must be positive"),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  images: z.array(imageUrlSchema).max(MAX_GALLERY_IMAGES).default([]),
});

export const createVariantSchema = z.object({
  name: z.string().min(1, "Variant name is required"),
  sku: z.string().min(1, "SKU is required"),
  attributes: z.array(
    z.object({ key: z.string(), value: z.string() })
  ),
  retailPrice: z.number().min(0),
  images: z.array(imageUrlSchema).max(MAX_GALLERY_IMAGES).default([]),
});

export const updateProductSchema = createProductSchema.partial();
export const updateVariantSchema = createVariantSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
