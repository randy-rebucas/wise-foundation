/** Sanitize a logical folder path for uploads (local paths or Cloudinary folders). */
export function sanitizeUploadFolder(folder: string): string {
  const segments = folder
    .replace(/\\/g, "/")
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s && s !== "." && s !== "..");
  if (!segments.length) throw new Error("Invalid upload folder");
  return segments.join("/");
}
