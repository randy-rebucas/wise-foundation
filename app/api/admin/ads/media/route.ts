import logger from "@/lib/logger";
import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { imageUploadConfigured } from "@/lib/server/imageStorage";
import { getAdsCreativeFolder } from "@/lib/server/uploadFolders";
import { collectImageFilesFromFormData } from "@/lib/server/imageUpload";
import { collectVideoFilesFromFormData } from "@/lib/server/videoUpload";
import {
  serializeMediaAssetForApi,
  uploadAndRegisterImages,
  uploadAndRegisterVideo,
} from "@/lib/services/media.service";
import {
  CloudinaryUploadError,
  httpStatusForCloudinaryError,
} from "@/lib/server/cloudinaryErrors";
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

export const runtime = "nodejs";
export const maxDuration = 60;

const VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function isVideoBlob(blob: Blob): boolean {
  if (blob.type) return VIDEO_MIMES.has(blob.type);
  const name = (blob as File).name ?? "";
  return /\.(mp4|webm|mov)$/i.test(name);
}

const postHandler = async (req: AuthedRequest) => {
  try {
    if (!imageUploadConfigured()) {
      return errorResponse(
        "Media upload is not available. Configure Cloudinary (CLOUDINARY_URL or CLOUDINARY_* env vars) or ensure the server can write to public/uploads.",
        503
      );
    }

    const formData = await req.formData();
    const isVideo = formData.get("creativeType") === "video";
    const folder = getAdsCreativeFolder();
    const uploadedBy =
      req.user?.id && /^[a-f0-9]{24}$/i.test(req.user.id) ? req.user.id : undefined;

    if (isVideo) {
      const files = collectVideoFilesFromFormData(formData);
      const file = files[0];
      if (!file || !isVideoBlob(file)) {
        return errorResponse('No video file received. Send multipart field "files".', 400);
      }
      const asset = await uploadAndRegisterVideo(file, folder, uploadedBy);
      if (!asset) return serverErrorResponse();
      return successResponse(serializeMediaAssetForApi(asset), "Ad video uploaded", 201);
    }

    const files = collectImageFilesFromFormData(formData);
    if (files.length === 0) {
      return errorResponse('No image file received. Send multipart field "files".', 400);
    }
    const assets = await uploadAndRegisterImages([files[0]], folder, uploadedBy);
    return successResponse(serializeMediaAssetForApi(assets[0]), "Ad image uploaded", 201);
  } catch (e) {
    logger.error({ err: e }, "[POST /api/admin/ads/media]");
    if (e instanceof CloudinaryUploadError) {
      return errorResponse(e.message, httpStatusForCloudinaryError(e));
    }
    if (e instanceof Error) return errorResponse(e.message, 500);
    return serverErrorResponse();
  }
};

export const POST = withStaffAuth(withPermission("manage:ads")(postHandler));
