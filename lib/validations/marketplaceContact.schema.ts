import { z } from "zod";

export const marketplaceContactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email(),
  subject: z.string().trim().min(2).max(200),
  message: z.string().trim().min(10).max(5000),
});
