import { listCustomerNotifications } from "@/lib/services/customerNotifications.service";
import { successResponse, withCustomerRoute } from "@/lib/utils/withCustomerRoute";

export const GET = withCustomerRoute(async (userId) => {
  const notifications = await listCustomerNotifications(userId);
  return successResponse(notifications);
});
