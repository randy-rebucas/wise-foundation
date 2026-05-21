import { buildImageUploadStatusPayload } from "@/lib/server/imageUploadStatus";
import { successResponse } from "@/lib/utils/apiResponse";
import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

export const runtime = "nodejs";

const getHandler = async (_req: AuthedRequest) => {
  return successResponse(await buildImageUploadStatusPayload());
};

export const GET = withStaffAuth(withPermission("manage:products")(getHandler));
