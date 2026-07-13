import logger from "@/lib/logger";
import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { imageUploadConfigured } from "@/lib/server/imageStorage";
import { getBlogCoverFolder } from "@/lib/server/uploadFolders";
import { collectImageFilesFromFormData } from "@/lib/server/imageUpload";
import { serializeMediaAssetForApi, uploadAndRegisterImages } from "@/lib/services/media.service";
import {
  CloudinaryUploadError,
  httpStatusForCloudinaryError,
} from "@/lib/server/cloudinaryErrors";
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

export const runtime = "nodejs";
export const maxDuration = 60;

const postHandler = async (req: AuthedRequest) => {
  try {
    if (!imageUploadConfigured()) {
      return errorResponse(
        "Media upload is not available. Configure Cloudinary (CLOUDINARY_URL or CLOUDINARY_* env vars) or ensure the server can write to public/uploads.",
        503
      );
    }

    const formData = await req.formData();
    const folder = getBlogCoverFolder();
    const uploadedBy =
      req.user?.id && /^[a-f0-9]{24}$/i.test(req.user.id) ? req.user.id : undefined;

    const files = collectImageFilesFromFormData(formData);
    if (files.length === 0) {
      return errorResponse('No image file received. Send multipart field "files".', 400);
    }
    const assets = await uploadAndRegisterImages([files[0]], folder, uploadedBy);
    return successResponse(serializeMediaAssetForApi(assets[0]), "Cover image uploaded", 201);
  } catch (e) {
    logger.error({ err: e }, "[POST /api/admin/blog/media]");
    if (e instanceof CloudinaryUploadError) {
      return errorResponse(e.message, httpStatusForCloudinaryError(e));
    }
    if (e instanceof Error) return errorResponse(e.message, 500);
    return serverErrorResponse();
  }
};

export const POST = withStaffAuth(withPermission("manage:blog")(postHandler));
