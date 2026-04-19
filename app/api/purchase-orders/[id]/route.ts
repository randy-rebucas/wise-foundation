import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import {
  getPurchaseOrderById,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
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
    const po = await getPurchaseOrderById(id);
    if (!po) return notFoundResponse("Purchase order not found");
    return successResponse(po);
  } catch {
    return serverErrorResponse();
  }
};

const putHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const body = await req.json();
    const parsed = updatePurchaseOrderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }
    const po = await updatePurchaseOrder(id, parsed.data);
    if (!po) return notFoundResponse("Purchase order not found");
    return successResponse(po, "Purchase order updated");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

const patchHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const { status } = await req.json();
    if (!status) return errorResponse("Status is required");
    const po = await updatePurchaseOrderStatus(id, status as PurchaseOrderStatus, req.user.id);
    if (!po) return notFoundResponse("Purchase order not found");
    return successResponse(po, `Purchase order ${status}`);
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withAuth(withPermission("manage:inventory")(getHandler));
export const PUT = withAuth(withPermission("manage:inventory")(putHandler));
export const PATCH = withAuth(withPermission("manage:inventory")(patchHandler));
