import "server-only";

import { isCloudinaryAccountError, normalizeCloudinaryError } from "@/lib/server/cloudinaryErrors";
import logger from "@/lib/logger";
import {
  cloudinaryConfigured,
  deleteCloudinaryImage,
  saveImageBufferToCloudinary,
} from "@/lib/server/cloudinaryStorage";
import {
  deleteStoredImage as deleteLocalStoredImage,
  getUploadRootDir,
  localImageStorageConfigured,
  saveImageBuffer as saveLocalImageBuffer,
} from "@/lib/server/localImageStorage";
import { UPLOAD_URL_PREFIX } from "@/lib/constants/uploads";
import {
  isCloudinaryStorageUrl,
  isStoredUploadUrl,
  parseCloudinaryPublicId,
  parseStoredUploadKey,
} from "@/lib/utils/storedImageUrl";

export type ImageStorageBackend = "cloudinary" | "local";

export function getImageStorageBackend(): ImageStorageBackend {
  return cloudinaryConfigured() ? "cloudinary" : "local";
}

/** True when Cloudinary is configured or the local upload directory is writable. */
export function imageUploadConfigured(): boolean {
  return cloudinaryConfigured() || localImageStorageConfigured();
}

export function getStorageDescription(): string {
  if (cloudinaryConfigured()) return "Cloudinary";
  return getUploadRootDir();
}

export interface ImageSaveResult {
  url: string;
  publicId: string;
  bytes: number;
}

export async function saveImageBuffer(
  buffer: Buffer,
  folder: string,
  mime: string
): Promise<ImageSaveResult> {
  if (cloudinaryConfigured()) {
    try {
      return await saveImageBufferToCloudinary(buffer, folder, mime);
    } catch (err) {
      if (isCloudinaryAccountError(err) && localImageStorageConfigured()) {
        logger.warn(
          { err: err instanceof Error ? err.message : err },
          "[imageStorage] Cloudinary unavailable, falling back to local storage"
        );
        return saveLocalImageBuffer(buffer, folder, mime);
      }
      throw normalizeCloudinaryError(err);
    }
  }
  return saveLocalImageBuffer(buffer, folder, mime);
}

export async function deleteStoredImage(
  publicId: string,
  options?: { url?: string }
): Promise<void> {
  const url = options?.url?.trim();
  const key = publicId.trim();

  if (url && isCloudinaryStorageUrl(url)) {
    const cloudId = parseCloudinaryPublicId(url) ?? key;
    if (cloudId) {
      await deleteCloudinaryImage(cloudId);
    }
    return;
  }

  if (url && isStoredUploadUrl(url)) {
    const localKey = parseStoredUploadKey(url) ?? key;
    await deleteLocalStoredImage(localKey);
    return;
  }

  if (cloudinaryConfigured() && key && !key.startsWith(UPLOAD_URL_PREFIX)) {
    await deleteCloudinaryImage(key);
    return;
  }

  await deleteLocalStoredImage(key);
}
