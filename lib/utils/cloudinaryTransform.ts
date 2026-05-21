/**
 * Build a Cloudinary delivery URL with optional transforms (client-safe).
 * @see https://cloudinary.com/documentation/image_transformations
 */
export function cloudinaryTransformedUrl(
  url: string,
  options?: { width?: number; height?: number; crop?: "fill" | "limit" }
): string {
  const trimmed = url.trim();
  if (!trimmed.includes("res.cloudinary.com") || !trimmed.includes("/upload/")) {
    return trimmed;
  }

  const uploadIdx = trimmed.indexOf("/upload/");
  if (uploadIdx === -1) return trimmed;

  const parts: string[] = [];
  if (options?.width) parts.push(`w_${Math.round(options.width)}`);
  if (options?.height) parts.push(`h_${Math.round(options.height)}`);
  if (options?.crop) parts.push(`c_${options.crop}`);

  if (parts.length === 0) return trimmed;

  const transform = parts.join(",");
  const before = trimmed.slice(0, uploadIdx + "/upload/".length);
  const after = trimmed.slice(uploadIdx + "/upload/".length);
  return `${before}${transform}/${after}`;
}
