import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getPurchaseOrderByIdForUser, receivePurchaseOrder } from "@/lib/services/purchaseOrder.service";
import { receivePurchaseOrderSchema } from "@/lib/validations/purchaseOrder.schema";
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const postHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const existing = await getPurchaseOrderByIdForUser(id, req.user);
    if (!existing) return notFoundResponse("Purchase order not found");
    const body = await req.json();
    const parsed = receivePurchaseOrderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const po = await receivePurchaseOrder(id, req.user.id, parsed.data);
    return successResponse(po, "Purchase order received and stock updated");
  } catch (error) {
    console.error("[POST /api/purchase-orders/[id]/receive]", error);
    if (error instanceof Error) return errorResponse(error.message, 500);
    return serverErrorResponse();
  }
};

export const POST = withStaffAuth(withPermission("manage:inventory")(postHandler));
