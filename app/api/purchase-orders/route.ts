import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import {
  getPurchaseOrders,
  createPurchaseOrder,
  getPurchaseOrderStatusCounts,
} from "@/lib/services/purchaseOrder.service";
import { createPurchaseOrderSchema } from "@/lib/validations/purchaseOrder.schema";
import { successResponse, errorResponse, forbiddenResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const organizationId = searchParams.get("organizationId") ?? undefined;

    const [result, statusCounts] = await Promise.all([
      getPurchaseOrders(req.user, branchId, status, page, limit, organizationId),
      getPurchaseOrderStatusCounts(req.user, branchId, organizationId),
    ]);
    return successResponse(result.orders, undefined, 200, {
      page,
      limit,
      total: result.total,
      statusCounts,
    });
  } catch (error) {
    console.error("[GET /api/purchase-orders]", error);
    if (error instanceof Error) return errorResponse(error.message, 500);
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    const parsed = createPurchaseOrderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    if (req.user.role === "ORG_ADMIN" && req.user.organizationId) {
      if (parsed.data.organizationId !== String(req.user.organizationId)) {
        return forbiddenResponse("You can only create purchase orders for your organization.");
      }
    }

    const po = await createPurchaseOrder(req.user.id, parsed.data, req.user);
    return successResponse(po, "Purchase order created", 201);
  } catch (error) {
    console.error("[POST /api/purchase-orders]", error);
    if (error instanceof Error) return errorResponse(error.message, 500);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:inventory")(getHandler));
export const POST = withStaffAuth(withPermission("manage:inventory")(postHandler));
