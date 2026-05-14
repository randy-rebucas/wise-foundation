import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { cloudinaryConfigured, uploadImage } from "@/lib/utils/cloudinary";
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILES = 10;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/pjpeg"]);

/** Progressive JPEG is often reported as image/pjpeg; data URIs use image/jpeg. */
function mimeForDataUri(mime: string): string {
  return mime === "image/pjpeg" ? "image/jpeg" : mime;
}

/** Multipart parts are Blob-like; `instanceof File` is unreliable across Node / undici realms. */
function collectImageBlobParts(raw: FormDataEntryValue[]): Blob[] {
  const out: Blob[] = [];
  for (const x of raw) {
    if (typeof x === "string") continue;
    if (x === null || typeof x !== "object") continue;
    const b = x as Blob;
    if (typeof b.arrayBuffer === "function" && typeof b.size === "number" && b.size > 0) {
      out.push(b);
    }
  }
  return out;
}

function blobFileName(blob: Blob): string | undefined {
  const n = (blob as File).name;
  return typeof n === "string" && n.length > 0 ? n : undefined;
}

function resolveImageMimeFromMetadata(blob: Blob): string | null {
  if (blob.type && ALLOWED.has(blob.type)) return blob.type;
  const name = blobFileName(blob) ?? "";
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")).toLowerCase() : "";
  const fromExt: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  const inferred = fromExt[ext];
  if (inferred) return inferred;
  return null;
}

/** When type/filename are wrong, infer from magic bytes (common on Windows). */
async function sniffImageMime(blob: Blob): Promise<string | null> {
  const peek = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  if (peek.length < 3) return null;
  if (peek[0] === 0xff && peek[1] === 0xd8 && peek[2] === 0xff) return "image/jpeg";
  if (peek.length >= 4 && peek[0] === 0x89 && peek[1] === 0x50 && peek[2] === 0x4e && peek[3] === 0x47) {
    return "image/png";
  }
  if (peek.length >= 6 && peek[0] === 0x47 && peek[1] === 0x49 && peek[2] === 0x46 && peek[3] === 0x38) {
    return "image/gif";
  }
  if (
    peek.length >= 12 &&
    peek[0] === 0x52 &&
    peek[1] === 0x49 &&
    peek[2] === 0x46 &&
    peek[3] === 0x46 &&
    peek[8] === 0x57 &&
    peek[9] === 0x45 &&
    peek[10] === 0x42 &&
    peek[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

async function resolveUploadMime(blob: Blob): Promise<string | null> {
  const fromMeta = resolveImageMimeFromMetadata(blob);
  if (fromMeta) return fromMeta;
  return sniffImageMime(blob);
}

const postHandler = async (req: AuthedRequest) => {
  try {
    if (!cloudinaryConfigured()) {
      return errorResponse(
        "Image upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
        503
      );
    }

    const formData = await req.formData();
    const raw = formData.getAll("files");
    const files = collectImageBlobParts(raw);

    if (files.length === 0) {
      return errorResponse('No image files received. Send multipart field "files".', 400);
    }
    if (files.length > MAX_FILES) {
      return errorResponse(`Too many files at once (max ${MAX_FILES}).`, 400);
    }

    const urls: string[] = [];
    for (const file of files) {
      const mime = await resolveUploadMime(file);
      if (!mime) {
        const label = blobFileName(file) ?? "upload";
        const t = file.type || "(empty)";
        return errorResponse(
          `Unsupported type for "${label}" (${t}). Use JPEG, PNG, WebP, or GIF.`,
          400
        );
      }
      if (file.size > MAX_BYTES) {
        const label = blobFileName(file) ?? "upload";
        return errorResponse(
          `File too large: "${label}" (max ${MAX_BYTES / 1024 / 1024} MB).`,
          400
        );
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const dataUri = `data:${mimeForDataUri(mime)};base64,${buf.toString("base64")}`;
      const { url } = await uploadImage(dataUri, "products/catalog");
      urls.push(url);
    }

    return successResponse({ urls });
  } catch (e) {
    if (e instanceof Error) return errorResponse(e.message);
    return serverErrorResponse();
  }
};

export const POST = withAuth(withPermission("manage:products")(postHandler));
