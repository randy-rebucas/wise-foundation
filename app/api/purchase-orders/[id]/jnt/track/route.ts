import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { syncJntTrackingForPurchaseOrder } from "@/lib/services/jntDelivery.service";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const postHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const result = await syncJntTrackingForPurchaseOrder(id, req.user);
    return successResponse(result, "Tracking updated");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not refresh tracking";
    return errorResponse(msg, 400);
  }
};

export const POST = withStaffAuth(withPermission("manage:inventory")(postHandler));
