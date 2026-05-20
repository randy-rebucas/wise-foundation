import { z } from "zod";

export const bookJntDeliverySchema = z.object({
  recipientName: z.string().trim().min(2).max(100),
  recipientPhone: z.string().trim().min(8).max(20),
  recipientAddress: z.string().trim().min(5).max(300),
  recipientCity: z.string().trim().min(2).max(80),
  recipientRegion: z.string().trim().min(2).max(80),
  weightKg: z.number().min(0.1).max(500),
  parcelCount: z.number().int().min(1).max(20).optional(),
  remark: z.string().max(200).optional(),
});

export type BookJntDeliveryInput = z.infer<typeof bookJntDeliverySchema>;
