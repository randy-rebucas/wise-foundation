import { withAuth } from "@/lib/middleware/withAuth";
import { withTenant } from "@/lib/middleware/withTenant";
import { withPermission } from "@/lib/middleware/withPermission";
import { receivePurchaseOrder } from "@/lib/services/purchaseOrder.service";
import { receivePurchaseOrderSchema } from "@/lib/validations/purchaseOrder.schema";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const postHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    const body = await req.json();
    const parsed = receivePurchaseOrderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const po = await receivePurchaseOrder(req.user.tenantId, id, req.user.id, parsed.data);
    return successResponse(po, "Purchase order received and stock updated");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const POST = withAuth(withTenant(withPermission("manage:inventory")(postHandler)));
