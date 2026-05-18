import "server-only";

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
    return saveImageBufferToCloudinary(buffer, folder, mime);
  }
  return saveLocalImageBuffer(buffer, folder, mime);
}

export async function deleteStoredImage(
  publicId: string,
  _options?: { url?: string }
): Promise<void> {
  if (cloudinaryConfigured()) {
    await deleteCloudinaryImage(publicId);
    return;
  }
  await deleteLocalStoredImage(publicId);
}
