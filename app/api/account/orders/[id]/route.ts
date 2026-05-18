import { getMyMarketplaceOrderDetail } from "@/lib/services/customerAccountData.service";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { requireCustomerSession } from "@/lib/utils/requireCustomerSession";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { error, session } = await requireCustomerSession();
  if (error) return error;
  try {
    const { id } = await context.params;
    const order = await getMyMarketplaceOrderDetail(session!.user.id, id);
    if (!order) return errorResponse("Order not found", 404);
    return successResponse(order);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load order";
    return errorResponse(msg, 500);
  }
}
