import "server-only";

import { accessSync, constants, mkdirSync, unlinkSync, writeFileSync } from "fs";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { UPLOAD_URL_PREFIX } from "@/lib/constants/uploads";
import { sanitizeUploadFolder } from "@/lib/server/uploadPathUtils";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

/** Absolute directory where files are written (from `UPLOAD_DIR` / next.config `env`). */
export function getUploadRootDir(): string {
  const dir = process.env.UPLOAD_DIR?.trim();
  if (!dir) {
    throw new Error(
      "UPLOAD_DIR is not set. Add UPLOAD_DIR to .env.local or rely on next.config.ts env defaults."
    );
  }
  return dir;
}

export function localImageStorageConfigured(): boolean {
  try {
    const root = getUploadRootDir();
    mkdirSync(root, { recursive: true });
    accessSync(root, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function extensionForMime(mime: string): string {
  return MIME_TO_EXT[mime] ?? ".bin";
}

export function buildPublicUploadUrl(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${UPLOAD_URL_PREFIX}/${normalized}`;
}

export function resolveAbsoluteUploadPath(relativePath: string): string {
  const root = getUploadRootDir();
  const safe = sanitizeUploadFolder(relativePath.replace(/^\/+/, ""));
  const absolute = path.join(root, ...safe.split("/"));
  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid upload path");
  }
  return absolute;
}

export interface LocalImageSaveResult {
  url: string;
  publicId: string;
  bytes: number;
}

export async function saveImageBuffer(
  buffer: Buffer,
  folder: string,
  mime: string
): Promise<LocalImageSaveResult> {
  const safeFolder = sanitizeUploadFolder(folder);
  const filename = `${randomUUID()}${extensionForMime(mime)}`;
  const publicId = `${safeFolder}/${filename}`;
  const absolute = resolveAbsoluteUploadPath(publicId);

  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, buffer);

  return {
    url: buildPublicUploadUrl(publicId),
    publicId,
    bytes: buffer.length,
  };
}

/** Sync save for rare call sites; prefer async in route handlers. */
export function saveImageBufferSync(
  buffer: Buffer,
  folder: string,
  mime: string
): LocalImageSaveResult {
  const safeFolder = sanitizeUploadFolder(folder);
  const filename = `${randomUUID()}${extensionForMime(mime)}`;
  const publicId = `${safeFolder}/${filename}`;
  const absolute = resolveAbsoluteUploadPath(publicId);

  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, buffer);

  return {
    url: buildPublicUploadUrl(publicId),
    publicId,
    bytes: buffer.length,
  };
}

export async function deleteStoredImage(publicId: string): Promise<void> {
  const absolute = resolveAbsoluteUploadPath(publicId);
  await unlink(absolute).catch((err: NodeJS.ErrnoException) => {
    if (err.code !== "ENOENT") throw err;
  });
}

export function deleteStoredImageSync(publicId: string): void {
  try {
    const absolute = resolveAbsoluteUploadPath(publicId);
    unlinkSync(absolute);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
  }
}
