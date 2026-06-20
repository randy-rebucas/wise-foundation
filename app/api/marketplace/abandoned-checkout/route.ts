import { auth } from "@/auth";
import { snapshotAbandonedCheckout } from "@/lib/services/abandonedCheckout.service";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional().nullable(),
        name: z.string().min(1),
        variantName: z.string().optional(),
        sku: z.string().min(1),
        image: z.string().optional(),
        price: z.number().min(0),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1)
    .max(50),
  subtotal: z.number().min(0),
  discountAmount: z.number().min(0).default(0),
  shippingCost: z.number().min(0).default(0),
  total: z.number().min(0),
  paymentMethod: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Invalid checkout snapshot", 422);
    }

    const session = await auth();
    const customerId = session?.user?.role === "CUSTOMER" ? session.user.id : null;

    await snapshotAbandonedCheckout({ ...parsed.data, customerId });
    return successResponse({ saved: true });
  } catch {
    // Snapshot capture is best-effort and must never block checkout.
    return successResponse({ saved: false });
  }
}
