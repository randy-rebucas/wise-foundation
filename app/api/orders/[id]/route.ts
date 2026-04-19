import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getOrderById, updateOrderStatus } from "@/lib/services/order.service";
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import type { OrderStatus } from "@/types";

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    const order = await getOrderById(id);
    if (!order) return notFoundResponse("Order not found");
    return successResponse(order);
  } catch {
    return serverErrorResponse();
  }
};

const patchHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    const body = await req.json();

    if (!body.status) return errorResponse("Status is required");

    const validStatuses: OrderStatus[] = ["pending", "approved", "paid", "completed", "cancelled", "refunded"];
    if (!validStatuses.includes(body.status)) {
      return errorResponse(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }

    const order = await updateOrderStatus(id, body.status, req.user.id);
    if (!order) return notFoundResponse("Order not found");
    return successResponse(order, "Order updated");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withAuth(getHandler);
export const PATCH = withAuth(withPermission("manage:orders")(patchHandler));
