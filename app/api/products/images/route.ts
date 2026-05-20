import { z } from "zod";
import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { imageUploadConfigured } from "@/lib/server/imageStorage";
import { deleteMediaAssetsByUrls } from "@/lib/services/media.service";
import { MAX_IMAGES_PER_UPLOAD_BATCH } from "@/lib/constants/gallery";
import { getProductCatalogFolder } from "@/lib/server/uploadFolders";
import { collectImageFilesFromFormData } from "@/lib/server/imageUpload";
import { serializeMediaAssetForApi, uploadAndRegisterImages } from "@/lib/services/media.service";
import {
  CloudinaryUploadError,
  httpStatusForCloudinaryError,
} from "@/lib/server/cloudinaryErrors";
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/utils/apiResponse";
import { parseImageUrl } from "@/lib/utils/imageUrl";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

export const runtime = "nodejs";
export const maxDuration = 60;

const deleteBodySchema = z.object({
  urls: z
    .array(z.string().trim().refine((s) => parseImageUrl(s) !== null, "Invalid image URL"))
    .min(1)
    .max(MAX_IMAGES_PER_UPLOAD_BATCH),
});

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

    const folder = getProductCatalogFolder();
    const uploadedBy =
      req.user?.id && /^[a-f0-9]{24}$/i.test(req.user.id) ? req.user.id : undefined;
    const assets = await uploadAndRegisterImages(files, folder, uploadedBy);
    const items = assets.map((a) => serializeMediaAssetForApi(a));

    return successResponse(
      {
        urls: items.map((u) => u.url),
        items,
      },
      "Product images uploaded",
      201
    );
  } catch (e) {
    console.error("[POST /api/products/images]", e);
    if (e instanceof CloudinaryUploadError) {
      return errorResponse(e.message, httpStatusForCloudinaryError(e));
    }
    if (e instanceof Error) return errorResponse(e.message, 500);
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest) => {
  try {
    if (!(await imageUploadConfigured())) {
      return errorResponse("Image upload is not available.", 503);
    }
    const body = await req.json();
    const parsed = deleteBodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((i) => i.message).join(", "));
    }
    await deleteMediaAssetsByUrls(parsed.data.urls);
    return successResponse(null, "Images removed from storage");
  } catch (e) {
    if (e instanceof Error) return errorResponse(e.message);
    return serverErrorResponse();
  }
};

export const POST = withStaffAuth(withPermission("manage:products")(postHandler));
export const DELETE = withStaffAuth(withPermission("manage:products")(deleteHandler));
