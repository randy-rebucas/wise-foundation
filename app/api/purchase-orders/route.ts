import { withAuth } from "@/lib/middleware/withAuth";
import { withTenant } from "@/lib/middleware/withTenant";
import { withPermission } from "@/lib/middleware/withPermission";
import { getPurchaseOrders, createPurchaseOrder } from "@/lib/services/purchaseOrder.service";
import { createPurchaseOrderSchema } from "@/lib/validations/purchaseOrder.schema";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");

    const result = await getPurchaseOrders(req.user.tenantId, branchId, status, page, limit);
    return successResponse(result.orders, undefined, 200, {
      page,
      limit,
      total: result.total,
    });
  } catch {
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

    const po = await createPurchaseOrder(req.user.tenantId, req.user.id, parsed.data);
    return successResponse(po, "Purchase order created", 201);
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withAuth(withTenant(withPermission("manage:inventory")(getHandler)));
export const POST = withAuth(withTenant(withPermission("manage:inventory")(postHandler)));
