import { auth } from "@/auth";
import { quoteMarketplaceCheckout } from "@/lib/services/marketplaceCheckoutQuote.service";
import { MARKETPLACE_SHIPPING_METHODS } from "@/lib/utils/marketplaceShipping";
import { marketplaceShippingSchema } from "@/lib/validations/marketplace.schema";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { z } from "zod";

const shippingMethodIds = MARKETPLACE_SHIPPING_METHODS.map((m) => m.id) as [string, ...string[]];

const quoteBodySchema = z.object({
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
  shipping: marketplaceShippingSchema.partial().optional(),
  shippingMethod: z.enum(shippingMethodIds).optional(),
  paymentMethod: z.enum(["cash", "gcash", "card", "bank_transfer", "credit"]).optional(),
  couponCode: z.string().trim().max(32).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = quoteBodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Invalid quote request", 422);
    }

    const session = await auth();
    const customerUserId = session?.user?.role === "CUSTOMER" ? session.user.id : null;

    const shipping = parsed.data.shipping ?? {
      fullName: "",
      email: "guest@checkout.local",
      phone: "0000000000",
      line1: "—",
      city: "Quezon City",
      region: "Metro Manila",
      postalCode: "1100",
    };

    const shippingMethod =
      parsed.data.shippingMethod ?? MARKETPLACE_SHIPPING_METHODS[0].id;

    const quote = await quoteMarketplaceCheckout(
      {
        items: parsed.data.items,
        shippingMethod,
        shipping: {
          fullName: shipping.fullName ?? "",
          email: shipping.email ?? "guest@checkout.local",
          phone: shipping.phone ?? "",
          line1: shipping.line1 ?? "—",
          line2: shipping.line2,
          city: shipping.city ?? "Quezon City",
          region: shipping.region ?? "Metro Manila",
          postalCode: shipping.postalCode ?? "1100",
        },
        paymentMethod: parsed.data.paymentMethod,
        couponCode: parsed.data.couponCode,
      },
      customerUserId
    );

    return successResponse(quote);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not quote checkout";
    return errorResponse(msg, 400);
  }
}
