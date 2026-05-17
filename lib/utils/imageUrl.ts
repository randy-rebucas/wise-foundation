import { isStoredUploadUrl } from "@/lib/utils/storedImageUrl";

/** Normalize and validate an http(s) or app-hosted upload image URL. Returns null if invalid. */
export function parseImageUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (isStoredUploadUrl(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}
