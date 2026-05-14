import { auth } from "@/auth";
import { listMyMarketplaceOrders } from "@/lib/services/customerOrders.service";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "CUSTOMER") {
      return errorResponse("Unauthorized", 401);
    }

    const orders = await listMyMarketplaceOrders(session.user.id);
    return successResponse(orders);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load orders";
    return errorResponse(msg, 500);
  }
}
