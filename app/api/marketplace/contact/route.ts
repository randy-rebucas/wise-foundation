import { submitMarketplaceContactMessage } from "@/lib/services/marketplace.service";
import { marketplaceContactSchema } from "@/lib/validations/marketplaceContact.schema";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = marketplaceContactSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }
    await submitMarketplaceContactMessage(parsed.data);
    return successResponse({ ok: true }, "Message received");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not send message";
    return errorResponse(msg, 500);
  }
}
