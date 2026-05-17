import { imageUploadConfigured, getUploadRootDir } from "@/lib/server/localImageStorage";
import {
  getUploadRootFolder,
  getMediaLibraryFolder,
  getProductCatalogFolder,
} from "@/lib/server/uploadFolders";
import { UPLOAD_URL_PREFIX } from "@/lib/constants/uploads";
import { successResponse } from "@/lib/utils/apiResponse";

export const runtime = "nodejs";

export async function GET() {
  return successResponse({
    configured: imageUploadConfigured(),
    uploadUrlPrefix: UPLOAD_URL_PREFIX,
    storagePath: getUploadRootDir(),
    rootFolder: getUploadRootFolder(),
    mediaLibraryFolder: getMediaLibraryFolder(),
    productCatalogFolder: getProductCatalogFolder(),
  });
}
