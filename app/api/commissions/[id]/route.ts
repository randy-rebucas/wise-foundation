import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { markCommissionPaid, cancelCommission } from "@/lib/services/commission.service";
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const patchHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    const body = await req.json();
    const action = body.action as "pay" | "cancel";

    if (action === "pay") {
      const updated = await markCommissionPaid(id, req.user.id, body.notes);
      if (!updated) return notFoundResponse("Commission not found");
      return successResponse(updated, "Commission marked as paid");
    }

    if (action === "cancel") {
      const updated = await cancelCommission(id);
      if (!updated) return notFoundResponse("Commission not found");
      return successResponse(updated, "Commission cancelled");
    }

    return errorResponse("Invalid action. Use 'pay' or 'cancel'");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const PATCH = withAuth(withPermission("manage:organizations")(patchHandler));
