import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { updatePurchaseOrderDiscount } from "@/lib/services/purchaseOrder.service";
import logger from "@/lib/logger";
import { purchaseOrderDiscountPercentSchema } from "@/lib/validations/purchaseOrder.schema";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import { canSetPurchaseOrderDiscount } from "@/lib/permissions/purchaseOrders";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const patchHandler = async (req: AuthedRequest, ctx: unknown) => {
  if (!canSetPurchaseOrderDiscount(req.user)) {
    return forbiddenResponse("Only administrators can set purchase order discounts");
  }

  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const body = await req.json();
    const parsed = purchaseOrderDiscountPercentSchema.safeParse(body?.discountPercent);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const po = await updatePurchaseOrderDiscount(id, parsed.data, req.user);
    if (!po) return notFoundResponse("Purchase order not found");
    return successResponse(po, "Purchase order discount updated");
  } catch (error) {
    logger.error({ err: error }, "[PATCH /api/purchase-orders/[id]/discount]");
    if (error instanceof Error) return errorResponse(error.message, 500);
    return serverErrorResponse();
  }
};

export const PATCH = withStaffAuth(patchHandler);
