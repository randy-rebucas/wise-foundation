import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { markCommissionPaid, cancelCommission } from "@/lib/services/commission.service";
import { canManageCommissionPayouts } from "@/lib/permissions/commissionAccess";
import {
  successResponse,
  errorResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const patchHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    if (!canManageCommissionPayouts(req.user.role)) {
      return forbiddenResponse("Only platform administrators can update commission payouts");
    }

    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const body = await req.json();
    const action = body.action as "pay" | "cancel";

    if (action === "pay") {
      const updated = await markCommissionPaid(id, req.user.id, body.notes, {
        id: req.user.id,
        name: req.user.name,
      });
      if (!updated) return notFoundResponse("Commission not found");
      return successResponse(updated, "Commission marked as paid");
    }

    if (action === "cancel") {
      const updated = await cancelCommission(id, { id: req.user.id, name: req.user.name });
      if (!updated) return notFoundResponse("Commission not found");
      return successResponse(updated, "Commission cancelled");
    }

    return errorResponse("Invalid action. Use 'pay' or 'cancel'");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const PATCH = withStaffAuth(withPermission("manage:organizations")(patchHandler));
