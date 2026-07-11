import { connectDB } from "@/lib/db/connect";
import { Ad } from "@/lib/db/models/Ad";
import { Product } from "@/lib/db/models/Product";
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
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    await connectDB();
    const ad = await Ad.findOne({ _id: id, deletedAt: null })
      .populate("productId", "name slug images")
      .lean();
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

    await connectDB();

    if (parsed.data.productId) {
      const product = await Product.findById(parsed.data.productId).select("_id").lean();
      if (!product) return errorResponse("Product not found", 404);
    }

    const ad = await Ad.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: parsed.data },
      { new: true }
    );
    if (!ad) return notFoundResponse("Ad not found");

    void writeAuditLog({
      action: "ad.updated",
      actor: { id: req.user.id, name: req.user.name },
      targetId: id,
      targetType: "Ad",
    });

    return successResponse(ad, "Ad updated");
  } catch (err) {
    console.error("[admin/ads/:id] PATCH error", err);
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest, ctx: unknown) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    await connectDB();

    const ad = await Ad.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true }
    );
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
