import { withAuth } from "@/lib/middleware/withAuth";
import { withTenant } from "@/lib/middleware/withTenant";
import { withPermission } from "@/lib/middleware/withPermission";
import { getOrderById, updateOrderStatus } from "@/lib/services/order.service";
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import type { OrderStatus } from "@/types";

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    const order = await getOrderById(req.user.tenantId, id);
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

    const validStatuses: OrderStatus[] = ["pending", "paid", "completed", "cancelled", "refunded"];
    if (!validStatuses.includes(body.status)) {
      return errorResponse(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }

    const order = await updateOrderStatus(req.user.tenantId, id, body.status, req.user.id);
    if (!order) return notFoundResponse("Order not found");
    return successResponse(order, "Order updated");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withAuth(withTenant(getHandler));
export const PATCH = withAuth(withTenant(withPermission("manage:orders")(patchHandler)));
