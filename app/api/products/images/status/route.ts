import { cloudinaryConfigured, pingCloudinary } from "@/lib/server/cloudinaryStorage";
import {
  getImageStorageBackend,
  getStorageDescription,
  imageUploadConfigured,
} from "@/lib/server/imageStorage";
import { getUploadRootDir } from "@/lib/server/localImageStorage";
import {
  getUploadRootFolder,
  getMediaLibraryFolder,
  getProductCatalogFolder,
} from "@/lib/server/uploadFolders";
import { UPLOAD_URL_PREFIX } from "@/lib/constants/uploads";
import { successResponse } from "@/lib/utils/apiResponse";

export const runtime = "nodejs";

export async function GET() {
  const backend = getImageStorageBackend();
  const cloudinaryPing = cloudinaryConfigured() ? await pingCloudinary() : null;

  return successResponse({
    configured: imageUploadConfigured(),
    backend,
    cloudinary: cloudinaryPing
      ? { configured: true, ok: cloudinaryPing.ok, error: cloudinaryPing.ok ? undefined : cloudinaryPing.error }
      : { configured: false, ok: false },
    uploadUrlPrefix: UPLOAD_URL_PREFIX,
    storagePath: backend === "local" ? getUploadRootDir() : getStorageDescription(),
    rootFolder: getUploadRootFolder(),
    mediaLibraryFolder: getMediaLibraryFolder(),
    productCatalogFolder: getProductCatalogFolder(),
  });
}
