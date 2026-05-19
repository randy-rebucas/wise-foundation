import { listAddressesFromOrders } from "@/lib/services/customerAddresses.service";
import { successResponse, withCustomerRoute } from "@/lib/utils/withCustomerRoute";

export const GET = withCustomerRoute(async (userId) => {
  const addresses = await listAddressesFromOrders(userId);
  return successResponse(addresses);
});
