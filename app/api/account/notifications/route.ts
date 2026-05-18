import { auth } from "@/auth";
import { listCustomerNotifications } from "@/lib/services/customerNotifications.service";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "CUSTOMER") {
      return errorResponse("Unauthorized", 401);
    }

    const notifications = await listCustomerNotifications(session.user.id);
    return successResponse(notifications);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load notifications";
    return errorResponse(msg, 500);
  }
}
