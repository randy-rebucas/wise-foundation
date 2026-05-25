/**
 * Build a Cloudinary delivery URL with optional transforms (client-safe).
 * Always applies f_auto (format) and q_auto (quality) for bandwidth savings.
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

  // f_auto + q_auto are always applied; width/crop are optional
  const parts: string[] = ["f_auto", "q_auto"];
  if (options?.width) parts.push(`w_${Math.round(options.width)}`);
  if (options?.height) parts.push(`h_${Math.round(options.height)}`);
  if (options?.crop) parts.push(`c_${options.crop}`);

  const transform = parts.join(",");
  const before = trimmed.slice(0, uploadIdx + "/upload/".length);
  const after = trimmed.slice(uploadIdx + "/upload/".length);

  // Avoid double-injecting if transforms already present (not a raw /vNNN/ path)
  if (/^[a-z]_/.test(after)) return trimmed;

  return `${before}${transform}/${after}`;
}
