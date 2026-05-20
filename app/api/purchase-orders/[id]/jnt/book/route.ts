import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { bookJntDeliveryForPurchaseOrder } from "@/lib/services/jntDelivery.service";
import { bookJntDeliverySchema } from "@/lib/validations/jnt.schema";
import { errorResponse, successResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const postHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const body = await req.json();
    const parsed = bookJntDeliverySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Invalid request", 422);
    }

    const result = await bookJntDeliveryForPurchaseOrder(id, req.user, parsed.data);
    return successResponse(result, "J&T delivery booked");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not book J&T delivery";
    return errorResponse(msg, 400);
  }
};

export const POST = withStaffAuth(withPermission("manage:inventory")(postHandler));
