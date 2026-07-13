import { z } from "zod";
import { parseImageUrl } from "@/lib/utils/imageUrl";

const mediaUrlSchema = z
  .string()
  .trim()
  .refine((s) => parseImageUrl(s) !== null, "Must be a valid http(s) URL or /uploads/ path")
  .transform((s) => parseImageUrl(s)!);

const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens");

const blogPostBaseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  slug: slugSchema,
  summary: z.string().trim().min(1, "Summary is required").max(300),
  coverImage: mediaUrlSchema.optional(),
  author: z.string().trim().max(80).optional().transform((v) => (v?.trim() ? v.trim() : "Team")),
  tags: z.array(z.string().trim().min(1)).optional().default([]),
  bodyMarkdown: z.string().trim().min(1, "Body is required"),
  isPublished: z.boolean().default(false),
  publishedAt: z.coerce.date().optional().nullable(),
});

export const createBlogPostSchema = blogPostBaseSchema;
export const updateBlogPostSchema = blogPostBaseSchema.partial();

export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;
