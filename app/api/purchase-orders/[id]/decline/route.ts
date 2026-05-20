import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { getPurchaseOrderByIdForUser, declinePurchaseOrder } from "@/lib/services/purchaseOrder.service";
import { declinePurchaseOrderSchema } from "@/lib/validations/purchaseOrder.schema";
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
    const existing = await getPurchaseOrderByIdForUser(id, req.user);
    if (!existing) return notFoundResponse("Purchase order not found");

    const body = await req.json().catch(() => ({}));
    const parsed = declinePurchaseOrderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const po = await declinePurchaseOrder(id, req.user, parsed.data.reason);
    return successResponse(po, "Purchase order declined");
  } catch (error) {
    console.error("[POST /api/purchase-orders/[id]/decline]", error);
    if (error instanceof Error) return errorResponse(error.message, 400);
    return serverErrorResponse();
  }
};

export const POST = withStaffAuth(postHandler);
