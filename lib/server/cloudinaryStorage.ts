import "server-only";

import { v2 as cloudinary } from "cloudinary";
import { sanitizeUploadFolder } from "@/lib/server/uploadPathUtils";

let configApplied = false;

function applyCloudinaryConfig(): void {
  if (configApplied) return;

  const cloudinaryUrl = process.env.CLOUDINARY_URL?.trim();
  if (cloudinaryUrl) {
    cloudinary.config({ secure: true });
  } else {
    const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const api_key = process.env.CLOUDINARY_API_KEY?.trim();
    const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();
    if (!cloud_name || !api_key || !api_secret) {
      throw new Error("Cloudinary is not configured");
    }
    cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  }

  configApplied = true;
}

export function cloudinaryConfigured(): boolean {
  if (process.env.CLOUDINARY_URL?.trim()) return true;
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim()
  );
}

const MIME_TO_FORMAT: Record<string, string | undefined> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export interface CloudinaryImageSaveResult {
  url: string;
  publicId: string;
  bytes: number;
}

export async function saveImageBufferToCloudinary(
  buffer: Buffer,
  folder: string,
  mime: string
): Promise<CloudinaryImageSaveResult> {
  if (!cloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured");
  }

  applyCloudinaryConfig();
  const safeFolder = sanitizeUploadFolder(folder);
  const format = MIME_TO_FORMAT[mime];

  const result = await new Promise<{
    secure_url: string;
    public_id: string;
    bytes?: number;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: safeFolder,
        resource_type: "image",
        ...(format ? { format } : {}),
      },
      (error, uploadResult) => {
        if (error) reject(error);
        else if (!uploadResult) reject(new Error("Cloudinary upload returned no result"));
        else resolve(uploadResult);
      }
    );
    stream.end(buffer);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes ?? buffer.length,
  };
}

export async function deleteCloudinaryImage(publicId: string): Promise<void> {
  if (!cloudinaryConfigured()) return;

  applyCloudinaryConfig();
  const trimmed = publicId.trim();
  if (!trimmed) return;

  await cloudinary.uploader.destroy(trimmed, { resource_type: "image" }).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("not found") || message.includes("404")) return;
    throw err;
  });
}
