import { listMyMarketplaceOrders } from "@/lib/services/customerOrders.service";
import { successResponse, withCustomerRoute } from "@/lib/utils/withCustomerRoute";

export const GET = withCustomerRoute(async (userId) => {
  const orders = await listMyMarketplaceOrders(userId);
  return successResponse(orders);
});
