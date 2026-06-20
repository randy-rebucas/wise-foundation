import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { deleteAbandonedCheckout } from "@/lib/services/abandonedCheckout.service";
import { successResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const deleteHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    await deleteAbandonedCheckout(id);
    return successResponse(null, "Abandoned checkout removed");
  } catch {
    return serverErrorResponse();
  }
};

export const DELETE = withStaffAuth(withPermission("manage:orders")(deleteHandler));
