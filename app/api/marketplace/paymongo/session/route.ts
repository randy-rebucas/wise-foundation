import { auth } from "@/auth";
import { createMarketplaceCheckoutSession } from "@/lib/services/paymongoCheckout.service";
import { z } from "zod";
import { marketplaceShippingSchema } from "@/lib/validations/marketplace.schema";
import { MARKETPLACE_SHIPPING_METHODS } from "@/lib/utils/marketplaceShipping";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";

const shippingMethodIds = MARKETPLACE_SHIPPING_METHODS.map((m) => m.id) as [
  string,
  ...string[],
];

const sessionBodySchema = z.object({
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
  shippingMethod: z.enum(shippingMethodIds),
  paymentMethod: z.enum(["card", "gcash", "maya", "grab_pay"]),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = sessionBodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Invalid request", 422);
    }

    const session = await auth();
    const customerUserId = session?.user?.role === "CUSTOMER" ? session.user.id : null;

    const result = await createMarketplaceCheckoutSession(
      {
        items: parsed.data.items,
        shipping: parsed.data.shipping,
        shippingMethod: parsed.data.shippingMethod,
        paymentMethod: parsed.data.paymentMethod,
      },
      customerUserId,
      parsed.data.successUrl,
      parsed.data.cancelUrl
    );

    return successResponse({
      sessionId: result.sessionId,
      checkoutUrl: result.checkoutUrl,
      total: result.quote.total,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not create checkout session";
    const status = msg.toLowerCase().includes("not configured") ? 503 : 400;
    return errorResponse(msg, status);
  }
}
