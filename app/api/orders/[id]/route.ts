import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getOrderById, updateOrderStatus } from "@/lib/services/order.service";
import { successResponse, errorResponse, notFoundResponse, forbiddenResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import type { OrderStatus } from "@/types";

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const order = await getOrderById(id);
    if (!order) return notFoundResponse("Order not found");

    const { role, organizationId, branchIds } = req.user;

    if (role === "ORG_ADMIN" && organizationId) {
      const orgId = organizationId.toString();
      const toId = (f: unknown) => (f && typeof f === "object" && "_id" in f ? String((f as { _id: unknown })._id) : f ? String(f) : null);
      const buyerOrgId = toId(order.buyerOrganizationId);
      const sellerOrgId = toId(order.sellerOrganizationId);
      if (buyerOrgId !== orgId && sellerOrgId !== orgId) {
        return forbiddenResponse("Access denied");
      }
    } else if (role !== "ADMIN" && order.branchId) {
      const orderBranchId = String(order.branchId);
      if (!branchIds.map(String).includes(orderBranchId)) {
        return forbiddenResponse("Access denied");
      }
    }

    return successResponse(order);
  } catch {
    return serverErrorResponse();
  }
};

const patchHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const body = await req.json();

    if (!body.status) return errorResponse("Status is required");

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

export const GET = withAuth(getHandler);
export const PATCH = withAuth(withPermission("manage:orders")(patchHandler));
