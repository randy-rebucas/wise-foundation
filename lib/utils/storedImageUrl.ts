/** Client-safe helpers for app-hosted upload URLs (`/uploads/...`). */

import { UPLOAD_URL_PREFIX } from "@/lib/constants/uploads";

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

/** Relative storage key (publicId), e.g. `glowish/media/library/uuid.jpg`. */
export function parseStoredUploadKey(url: string): string | null {
  if (!isStoredUploadUrl(url)) return null;
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
