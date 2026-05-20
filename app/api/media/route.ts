import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { imageUploadConfigured } from "@/lib/server/imageStorage";
import { MAX_IMAGES_PER_UPLOAD_BATCH } from "@/lib/constants/gallery";
import { getMediaLibraryFolder } from "@/lib/server/uploadFolders";
import { collectImageFilesFromFormData } from "@/lib/server/imageUpload";
import {
  listMediaAssets,
  serializeMediaAssetForApi,
  uploadAndRegisterImages,
} from "@/lib/services/media.service";
import {
  CloudinaryUploadError,
  httpStatusForCloudinaryError,
} from "@/lib/server/cloudinaryErrors";
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/utils/apiResponse";
import { parsePagination } from "@/lib/utils/pagination";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

export const runtime = "nodejs";
export const maxDuration = 60;

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const sp = new URLSearchParams(searchParams);
    if (!sp.has("limit")) sp.set("limit", "24");
    const { page, limit } = parsePagination(sp);
    const search = searchParams.get("search") ?? undefined;
    const result = await listMediaAssets(page, limit, search);
    const items = result.items.map((row) => serializeMediaAssetForApi(row));
    return successResponse(items, undefined, 200, {
      page,
      limit,
      total: result.total,
    });
  } catch (e) {
    if (e instanceof Error) return errorResponse(e.message);
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest) => {
  try {
    if (!(await imageUploadConfigured())) {
      return errorResponse(
        "Image upload is not available. Configure Cloudinary (CLOUDINARY_URL or CLOUDINARY_* env vars) or ensure the server can write to public/uploads.",
        503
      );
    }

    const formData = await req.formData();
    const files = collectImageFilesFromFormData(formData);
    if (files.length === 0) {
      return errorResponse('No image files received. Send multipart field "files".', 400);
    }
    if (files.length > MAX_IMAGES_PER_UPLOAD_BATCH) {
      return errorResponse(`Too many files at once (max ${MAX_IMAGES_PER_UPLOAD_BATCH}).`, 400);
    }

    const folder = getMediaLibraryFolder();
    const uploadedBy =
      req.user?.id && /^[a-f0-9]{24}$/i.test(req.user.id) ? req.user.id : undefined;
    const assets = await uploadAndRegisterImages(files, folder, uploadedBy);
    const items = assets.map((a) => serializeMediaAssetForApi(a));
    return successResponse(
      {
        items,
        urls: items.map((a) => a.url),
      },
      "Media uploaded",
      201
    );
  } catch (e) {
    console.error("[POST /api/media]", e);
    if (e instanceof CloudinaryUploadError) {
      return errorResponse(e.message, httpStatusForCloudinaryError(e));
    }
    if (e instanceof Error) return errorResponse(e.message, 500);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:products")(getHandler));
export const POST = withStaffAuth(withPermission("manage:products")(postHandler));
