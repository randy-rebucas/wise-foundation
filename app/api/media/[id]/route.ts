import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { deleteMediaAsset, getMediaAssetUsage } from "@/lib/services/media.service";
import { errorResponse, notFoundResponse, serverErrorResponse, successResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

export const runtime = "nodejs";

const getHandler = async (_req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const usage = await getMediaAssetUsage(id);
    if (!usage) return notFoundResponse("Media not found");
    return successResponse({
      asset: usage.asset,
      referenceCount: usage.referenceCount,
    });
  } catch (e) {
    if (e instanceof Error) return errorResponse(e.message);
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const result = await deleteMediaAsset(id);
    if (!result.ok) {
      if (result.reason === "not_found") return notFoundResponse("Media not found");
      return errorResponse(
        `This image is used on ${result.referenceCount} product(s) or variant(s). Remove it from those items first.`,
        409
      );
    }
    return successResponse({ referenceCount: result.referenceCount }, "Media deleted");
  } catch (e) {
    if (e instanceof Error) return errorResponse(e.message);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:products")(getHandler));

export const DELETE = withStaffAuth(withPermission("manage:products")(deleteHandler));
