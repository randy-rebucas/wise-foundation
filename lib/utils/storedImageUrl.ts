/** Client-safe helpers for app-hosted and Cloudinary upload URLs. */

import { UPLOAD_URL_PREFIX } from "@/lib/constants/uploads";

export function isCloudinaryStorageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    return host === "res.cloudinary.com" || host.endsWith(".res.cloudinary.com");
  } catch {
    return false;
  }
}

export function isStoredUploadUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.startsWith(`${UPLOAD_URL_PREFIX}/`)) return true;
  try {
    const u = new URL(trimmed);
    return u.pathname.startsWith(`${UPLOAD_URL_PREFIX}/`);
  } catch {
    return false;
  }
}

/** Local `/uploads/...` or Cloudinary CDN URLs managed by this app. */
export function isManagedStorageUrl(url: string): boolean {
  return isStoredUploadUrl(url) || isCloudinaryStorageUrl(url);
}

/** Cloudinary `public_id` from a delivery URL (best-effort). */
export function parseCloudinaryPublicId(url: string): string | null {
  if (!isCloudinaryStorageUrl(url)) return null;
  try {
    const u = new URL(url.trim());
    const uploadIdx = u.pathname.indexOf("/upload/");
    if (uploadIdx === -1) return null;

    let rest = u.pathname.slice(uploadIdx + "/upload/".length);
    if (/^v\d+\//.test(rest)) {
      rest = rest.replace(/^v\d+\//, "");
    }

    const withoutExt = rest.replace(/\.[^/.]+$/, "");
    return withoutExt.replace(/^\/+/, "") || null;
  } catch {
    return null;
  }
}

/** Relative storage key (publicId), e.g. `glowish/media/library/uuid`. */
export function parseStoredUploadKey(url: string): string | null {
  if (isStoredUploadUrl(url)) {
    const trimmed = url.trim();
    if (trimmed.startsWith(UPLOAD_URL_PREFIX)) {
      return trimmed.slice(UPLOAD_URL_PREFIX.length).replace(/^\/+/, "");
    }
    try {
      const u = new URL(trimmed);
      return u.pathname.slice(UPLOAD_URL_PREFIX.length).replace(/^\/+/, "") || null;
    } catch {
      return null;
    }
  }

  return parseCloudinaryPublicId(url);
}
