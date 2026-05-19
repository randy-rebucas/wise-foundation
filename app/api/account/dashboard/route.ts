import { getCustomerDashboard } from "@/lib/services/customerDashboard.service";
import { errorResponse, successResponse, withCustomerRoute } from "@/lib/utils/withCustomerRoute";

export const GET = withCustomerRoute(async (userId) => {
  const dashboard = await getCustomerDashboard(userId);
  if (!dashboard) {
    return errorResponse("Account not found", 404);
  }
  return successResponse(dashboard);
});
