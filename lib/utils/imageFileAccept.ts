/** Extensions treated as images when the browser omits `file.type` (common on Windows). */
export const IMAGE_FILE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".pjpeg"] as const;

/** `image/*` helps the OS file picker show all images; we still validate server-side. */
export const IMAGE_UPLOAD_ACCEPT_WITH_EXTENSIONS =
  "image/*,.jpg,.jpeg,.png,.webp,.gif,.pjpeg,image/jpeg,image/png,image/webp,image/gif,image/pjpeg";

export function fileExtension(name: string): string {
  const lower = name.toLowerCase();
  const i = lower.lastIndexOf(".");
  return i >= 0 ? lower.slice(i) : "";
}

export function isAllowedImageFile(file: File, accept?: string): boolean {
  const acceptList =
    accept?.trim() || IMAGE_UPLOAD_ACCEPT_WITH_EXTENSIONS;
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  const ext = fileExtension(name);

  const parts = acceptList.split(",").map((s) => s.trim().toLowerCase());

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith(".")) {
      if (name.endsWith(part) || ext === part) return true;
      continue;
    }
    if (part.endsWith("/*")) {
      const prefix = part.slice(0, -1);
      if (type && type.startsWith(prefix)) return true;
      continue;
    }
    if (type === part) return true;
  }

  if (!type && IMAGE_FILE_EXTENSIONS.includes(ext as (typeof IMAGE_FILE_EXTENSIONS)[number])) {
    return true;
  }

  return false;
}
