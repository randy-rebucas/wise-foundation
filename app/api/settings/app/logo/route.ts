import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { imageUploadConfigured } from "@/lib/server/imageStorage";
import logger from "@/lib/logger";
import { collectImageFilesFromFormData } from "@/lib/server/imageUpload";
import { removeAppLogo, uploadAppLogo } from "@/lib/services/appLogo.service";
import {
  CloudinaryUploadError,
  httpStatusForCloudinaryError,
} from "@/lib/server/cloudinaryErrors";
import {
  errorResponse,
  forbiddenResponse,
  serverErrorResponse,
  successResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

export const runtime = "nodejs";
export const maxDuration = 60;

const postHandler = async (req: AuthedRequest) => {
  if (req.user.role !== "ADMIN") {
    return forbiddenResponse("Only administrators can update the application logo");
  }
  try {
    if (!imageUploadConfigured()) {
      return errorResponse(
        "Image upload is not available. Configure Cloudinary or ensure the server can write to public/uploads.",
        503
      );
    }

    const formData = await req.formData();
    const files = collectImageFilesFromFormData(formData);
    if (files.length === 0) {
      return errorResponse('No image file received. Send multipart field "file".', 400);
    }
    if (files.length > 1) {
      return errorResponse("Upload one logo image at a time.", 400);
    }

    const settings = await uploadAppLogo(files[0]!, { id: req.user.id, name: req.user.name });
    return successResponse(settings, "Application logo updated", 201);
  } catch (e) {
    logger.error({ err: e }, "[POST /api/settings/app/logo]");
    if (e instanceof CloudinaryUploadError) {
      return errorResponse(e.message, httpStatusForCloudinaryError(e));
    }
    if (e instanceof Error) return errorResponse(e.message, 500);
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest) => {
  if (req.user.role !== "ADMIN") {
    return forbiddenResponse("Only administrators can remove the application logo");
  }
  try {
    const settings = await removeAppLogo({ id: req.user.id, name: req.user.name });
    return successResponse(settings, "Application logo removed");
  } catch (e) {
    logger.error({ err: e }, "[DELETE /api/settings/app/logo]");
    if (e instanceof Error) return errorResponse(e.message, 500);
    return serverErrorResponse();
  }
};

export const POST = withStaffAuth(postHandler);
export const DELETE = withStaffAuth(deleteHandler);
