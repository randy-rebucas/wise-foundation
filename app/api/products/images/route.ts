import { z } from "zod";
import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { imageUploadConfigured } from "@/lib/server/localImageStorage";
import { deleteMediaAssetsByUrls } from "@/lib/services/media.service";
import { MAX_IMAGES_PER_UPLOAD_BATCH } from "@/lib/constants/gallery";
import { getProductCatalogFolder } from "@/lib/server/uploadFolders";
import { collectImageFilesFromFormData } from "@/lib/server/imageUpload";
import { serializeMediaAssetForApi, uploadAndRegisterImages } from "@/lib/services/media.service";
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
    if (!imageUploadConfigured()) {
      return errorResponse(
        "Image upload is not available. Ensure the server can write to public/uploads (or set UPLOAD_DIR).",
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
    if (e instanceof Error) return errorResponse(e.message);
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest) => {
  try {
    if (!imageUploadConfigured()) {
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

export const POST = withAuth(withPermission("manage:products")(postHandler));
export const DELETE = withAuth(withPermission("manage:products")(deleteHandler));
