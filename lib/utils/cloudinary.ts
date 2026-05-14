import { v2 as cloudinary } from "cloudinary";

function envTrim(key: string): string | undefined {
  const v = process.env[key];
  if (v === undefined || v === "") return undefined;
  return v
    .replace(/^\uFEFF/, "")
    .replace(/^\s*["']|["']\s*$/g, "")
    .trim() || undefined;
}

/** True when trimmed Cloudinary env vars are all set (matches `cloudinary.config`). */
export function cloudinaryConfigured(): boolean {
  return Boolean(
    envTrim("CLOUDINARY_CLOUD_NAME") &&
      envTrim("CLOUDINARY_API_KEY") &&
      envTrim("CLOUDINARY_API_SECRET")
  );
}

cloudinary.config({
  cloud_name: envTrim("CLOUDINARY_CLOUD_NAME"),
  api_key: envTrim("CLOUDINARY_API_KEY"),
  api_secret: envTrim("CLOUDINARY_API_SECRET"),
});

export async function uploadImage(
  file: string,
  folder = "livelihood/products"
): Promise<{ url: string; publicId: string }> {
  const result = await cloudinary.uploader.upload(file, {
    folder,
    transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
  });
  return { url: result.secure_url, publicId: result.public_id };
}

export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export { cloudinary };
