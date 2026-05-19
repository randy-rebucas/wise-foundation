import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { duplicatePurchaseOrderForUser } from "@/lib/services/purchaseOrder.service";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const postHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const po = await duplicatePurchaseOrderForUser(id, req.user.id, req.user);
    if (!po) return notFoundResponse("Purchase order not found");
    return successResponse(po, "Purchase order duplicated", 201);
  } catch (error) {
    console.error("[POST /api/purchase-orders/[id]/duplicate]", error);
    if (error instanceof Error) return errorResponse(error.message, 400);
    return serverErrorResponse();
  }
};

export const POST = withStaffAuth(withPermission("manage:inventory")(postHandler));
