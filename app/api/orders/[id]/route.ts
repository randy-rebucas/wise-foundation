import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { canUserAccessOrder, getOrderById, updateOrderStatus } from "@/lib/services/order.service";
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import type { OrderStatus } from "@/types";
import logger from "@/lib/logger";

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const order = await getOrderById(id);
    if (!order || !canUserAccessOrder(order, req.user)) return notFoundResponse("Order not found");

    return successResponse(order);
  } catch (err) {
    logger.error({ err }, "GET /api/orders/[id] error");
    return serverErrorResponse();
  }
};

const patchHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const body = await req.json();

    if (!body.status) return errorResponse("Status is required");

    const existing = await getOrderById(id);
    if (!existing || !canUserAccessOrder(existing, req.user)) {
      return notFoundResponse("Order not found");
    }

    const validStatuses: OrderStatus[] = [
      "pending",
      "approved",
      "paid",
      "delivered",
      "completed",
      "cancelled",
      "refunded",
    ];
    if (!validStatuses.includes(body.status)) {
      return errorResponse(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }

    if (body.status === "delivered") {
      const num = body.deliveryReceiptNumber;
      if (typeof num !== "string" || !num.trim()) {
        return errorResponse("deliveryReceiptNumber is required when status is delivered");
      }
    }

    const delivery =
      body.status === "delivered"
        ? {
            deliveryReceiptNumber: String(body.deliveryReceiptNumber).trim(),
            receivedByName:
              typeof body.receivedByName === "string" && body.receivedByName.trim()
                ? body.receivedByName.trim()
                : undefined,
          }
        : undefined;

    const order = await updateOrderStatus(id, body.status, req.user.id, delivery);
    if (!order) return notFoundResponse("Order not found");
    return successResponse(order, "Order updated");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:orders")(getHandler));
export const PATCH = withStaffAuth(withPermission("manage:orders")(patchHandler));
