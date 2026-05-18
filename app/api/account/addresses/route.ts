import { auth } from "@/auth";
import { listAddressesFromOrders } from "@/lib/services/customerAddresses.service";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "CUSTOMER") {
      return errorResponse("Unauthorized", 401);
    }

    const addresses = await listAddressesFromOrders(session.user.id);
    return successResponse(addresses);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load addresses";
    return errorResponse(msg, 500);
  }
}
