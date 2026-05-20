import { attachPaymentIntent } from "@/lib/paymongo/api";
import { isPaymongoConfigured } from "@/lib/paymongo/config";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { z } from "zod";

const attachSchema = z.object({
  paymentIntentId: z.string().min(1),
  paymentMethodId: z.string().min(1),
  clientKey: z.string().min(1),
  returnUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
  try {
    if (!isPaymongoConfigured()) {
      return errorResponse("PayMongo is not configured", 503);
    }

    const body = await req.json();
    const parsed = attachSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Invalid request", 422);
    }

    const intent = await attachPaymentIntent({
      paymentIntentId: parsed.data.paymentIntentId,
      paymentMethodId: parsed.data.paymentMethodId,
      clientKey: parsed.data.clientKey,
      returnUrl: parsed.data.returnUrl,
    });

    const redirectUrl = intent.attributes.next_action?.redirect?.url ?? null;

    return successResponse({
      status: intent.attributes.status,
      redirectUrl,
      paymentIntentId: intent.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Payment failed";
    return errorResponse(msg, 400);
  }
}
