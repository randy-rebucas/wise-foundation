import "server-only";

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

export interface ImageUploadStatusPayload {
  configured: boolean;
  backend: "cloudinary" | "local";
  cloudinary: {
    configured: boolean;
    ok: boolean;
    error?: string;
  };
  uploadUrlPrefix: string;
  storagePath: string;
  rootFolder: string;
  mediaLibraryFolder: string;
  productCatalogFolder: string;
}

export async function buildImageUploadStatusPayload(): Promise<ImageUploadStatusPayload> {
  const backend = getImageStorageBackend();
  const cloudinaryPing = cloudinaryConfigured() ? await pingCloudinary() : null;

  return {
    configured: imageUploadConfigured(),
    backend,
    cloudinary: cloudinaryPing
      ? {
          configured: true,
          ok: cloudinaryPing.ok,
          error: cloudinaryPing.ok ? undefined : cloudinaryPing.error,
        }
      : { configured: false, ok: false },
    uploadUrlPrefix: UPLOAD_URL_PREFIX,
    storagePath: backend === "local" ? getUploadRootDir() : getStorageDescription(),
    rootFolder: getUploadRootFolder(),
    mediaLibraryFolder: getMediaLibraryFolder(),
    productCatalogFolder: getProductCatalogFolder(),
  };
}
