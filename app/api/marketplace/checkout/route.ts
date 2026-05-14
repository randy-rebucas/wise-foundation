import { auth } from "@/auth";
import { placeMarketplaceOrder } from "@/lib/services/marketplace.service";
import { marketplaceCheckoutSchema } from "@/lib/validations/marketplace.schema";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = marketplaceCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Invalid checkout data", 422);
    }

    const session = await auth();
    const customerUserId = session?.user?.role === "CUSTOMER" ? session.user.id : null;

    const result = await placeMarketplaceOrder(parsed.data, { customerUserId });
    return successResponse(result, "Order placed", 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Checkout failed";
    if (msg.includes("No branch") || msg.includes("administrator")) {
      return errorResponse(msg, 503);
    }
    if (msg.includes("stock") || msg.includes("variant") || msg.includes("available")) {
      return errorResponse(msg, 409);
    }
    return errorResponse(msg, 400);
  }
}
