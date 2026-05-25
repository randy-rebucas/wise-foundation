import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withAnyPermission } from "@/lib/middleware/withAnyPermission";
import logger from "@/lib/logger";
import {
  getPurchaseOrderByIdForUser,
} from "@/lib/services/purchaseOrder.service";
import { signPurchaseOrder } from "@/lib/services/purchaseOrderSignature.service";
import { signPurchaseOrderSchema } from "@/lib/validations/purchaseOrder.schema";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

export const runtime = "nodejs";
export const maxDuration = 60;

const postHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const existing = await getPurchaseOrderByIdForUser(id, req.user);
    if (!existing) return notFoundResponse("Purchase order not found");

    const body = await req.json();
    const parsed = signPurchaseOrderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const po = await signPurchaseOrder(id, req.user, parsed.data);
    if (!po) return notFoundResponse("Purchase order not found");

    const message =
      parsed.data.role === "submit"
        ? "Purchase order submitted with signature"
        : "Purchase order approved with signature";

    return successResponse(po, message);
  } catch (error) {
    logger.error({ err: error }, "[POST /api/purchase-orders/[id]/sign]");
    if (error instanceof Error) return errorResponse(error.message, 500);
    return serverErrorResponse();
  }
};

export const POST = withStaffAuth(
  withAnyPermission("manage:inventory", "submit:org_orders")(postHandler)
);
