import { auth } from "@/auth";
import { createMarketplacePaymentIntent } from "@/lib/services/paymongoCheckout.service";
import { z } from "zod";
import { marketplaceShippingSchema } from "@/lib/validations/marketplace.schema";
import { MARKETPLACE_SHIPPING_METHODS } from "@/lib/utils/marketplaceShipping";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";

const shippingMethodIds = MARKETPLACE_SHIPPING_METHODS.map((m) => m.id) as [
  string,
  ...string[],
];

const intentBodySchema = z.object({
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
  paymentType: z.enum(["card", "gcash"]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = intentBodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Invalid request", 422);
    }

    const session = await auth();
    const customerUserId = session?.user?.role === "CUSTOMER" ? session.user.id : null;

    const result = await createMarketplacePaymentIntent(
      parsed.data,
      customerUserId,
      [parsed.data.paymentType]
    );

    return successResponse({
      paymentIntentId: result.paymentIntentId,
      clientKey: result.clientKey,
      status: result.status,
      total: result.quote.total,
      amountCentavos: result.quote.amountCentavos,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not create payment";
    return errorResponse(msg, 400);
  }
}
