import { auth } from "@/auth";
import { getCustomerDashboard } from "@/lib/services/customerDashboard.service";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "CUSTOMER") {
      return errorResponse("Unauthorized", 401);
    }

    const dashboard = await getCustomerDashboard(session.user.id);
    if (!dashboard) {
      return errorResponse("Account not found", 404);
    }

    return successResponse(dashboard);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load dashboard";
    return errorResponse(msg, 500);
  }
}
