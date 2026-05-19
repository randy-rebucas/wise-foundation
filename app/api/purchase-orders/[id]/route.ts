import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import {
  getPurchaseOrderByIdForUser,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrderForUser,
} from "@/lib/services/purchaseOrder.service";
import { updatePurchaseOrderSchema } from "@/lib/validations/purchaseOrder.schema";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import type { PurchaseOrderStatus } from "@/types";

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const po = await getPurchaseOrderByIdForUser(id, req.user);
    if (!po) return notFoundResponse("Purchase order not found");
    return successResponse(po);
  } catch (error) {
    console.error("[GET /api/purchase-orders/[id]]", error);
    if (error instanceof Error) return errorResponse(error.message, 500);
    return serverErrorResponse();
  }
};

const putHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const existing = await getPurchaseOrderByIdForUser(id, req.user);
    if (!existing) return notFoundResponse("Purchase order not found");
    const body = await req.json();
    const parsed = updatePurchaseOrderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }
    const po = await updatePurchaseOrder(id, parsed.data);
    if (!po) return notFoundResponse("Purchase order not found");
    return successResponse(po, "Purchase order updated");
  } catch (error) {
    console.error("[PUT /api/purchase-orders/[id]]", error);
    if (error instanceof Error) return errorResponse(error.message, 500);
    return serverErrorResponse();
  }
};

const patchHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const existing = await getPurchaseOrderByIdForUser(id, req.user);
    if (!existing) return notFoundResponse("Purchase order not found");
    const { status } = await req.json();
    if (!status) return errorResponse("Status is required");
    const po = await updatePurchaseOrderStatus(id, status as PurchaseOrderStatus, req.user.id);
    if (!po) return notFoundResponse("Purchase order not found");
    return successResponse(po, `Purchase order ${status}`);
  } catch (error) {
    console.error("[PATCH /api/purchase-orders/[id]]", error);
    if (error instanceof Error) return errorResponse(error.message, 500);
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const deleted = await deletePurchaseOrderForUser(id, req.user);
    if (!deleted) return notFoundResponse("Purchase order not found");
    return successResponse(null, "Purchase order deleted");
  } catch (error) {
    console.error("[DELETE /api/purchase-orders/[id]]", error);
    if (error instanceof Error) return errorResponse(error.message, 500);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:inventory")(getHandler));
export const PUT = withStaffAuth(withPermission("manage:inventory")(putHandler));
export const PATCH = withStaffAuth(withPermission("manage:inventory")(patchHandler));
export const DELETE = withStaffAuth(withPermission("manage:inventory")(deleteHandler));
