import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { updateAdSchema } from "@/lib/validations/ad.schema";
import {
  successResponse,
  errorResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import { writeAuditLog } from "@/lib/services/audit.service";
import { getAdById, updateAd, deleteAd } from "@/lib/services/ad.service";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const ad = await getAdById(id);
    if (!ad) return notFoundResponse("Ad not found");
    return successResponse(ad);
  } catch (err) {
    console.error("[admin/ads/:id] GET error", err);
    return serverErrorResponse();
  }
};

const patchHandler = async (req: AuthedRequest, ctx: unknown) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const body = await req.json();
    const parsed = updateAdSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((issue) => issue.message).join(", "), 400);
    }

    const ad = await updateAd(id, parsed.data);
    if (!ad) return notFoundResponse("Ad not found");

    void writeAuditLog({
      action: "ad.updated",
      actor: { id: req.user.id, name: req.user.name },
      targetId: id,
      targetType: "Ad",
    });

    return successResponse(ad, "Ad updated");
  } catch (err) {
    if (err instanceof Error && err.message === "Product not found") {
      return errorResponse("Product not found", 404);
    }
    console.error("[admin/ads/:id] PATCH error", err);
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest, ctx: unknown) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

    const ad = await deleteAd(id);
    if (!ad) return notFoundResponse("Ad not found");

    void writeAuditLog({
      action: "ad.deleted",
      actor: { id: req.user.id, name: req.user.name },
      targetId: id,
      targetType: "Ad",
    });

    return successResponse(null, "Ad deleted");
  } catch (err) {
    console.error("[admin/ads/:id] DELETE error", err);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:ads")(getHandler));
export const PATCH = withStaffAuth(withPermission("manage:ads")(patchHandler));
export const DELETE = withStaffAuth(withPermission("manage:ads")(deleteHandler));
