import {
  deleteStoredImage,
  saveImageBuffer,
} from "@/lib/server/localImageStorage";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/constants/gallery";
import { fileExtension, IMAGE_FILE_EXTENSIONS } from "@/lib/utils/imageFileAccept";

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/pjpeg",
]);

const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pjpeg": "image/jpeg",
};

function mimeForDataUri(mime: string): string {
  return mime === "image/pjpeg" ? "image/jpeg" : mime;
}

export function collectImageBlobParts(raw: FormDataEntryValue[]): Blob[] {
  const out: Blob[] = [];
  for (const x of raw) {
    if (typeof x === "string") continue;
    if (x === null || typeof x !== "object") continue;
    const b = x as Blob;
    if (typeof b.size === "number" && b.size > 0) {
      out.push(b);
    }
  }
  return out;
}

/** Collect image file parts from multipart form data (supports `files` and `file` fields). */
export function collectImageFilesFromFormData(formData: FormData): Blob[] {
  const parts = [
    ...formData.getAll("files"),
    ...formData.getAll("file"),
  ];
  const fromFields = collectImageBlobParts(parts);
  if (fromFields.length > 0) return fromFields;

  const fallback: Blob[] = [];
  for (const [, value] of formData.entries()) {
    const batch = collectImageBlobParts([value]);
    fallback.push(...batch);
  }
  return fallback;
}

export function blobFileName(blob: Blob): string | undefined {
  const n = (blob as File).name;
  return typeof n === "string" && n.length > 0 ? n : undefined;
}

function resolveImageMimeFromMetadata(blob: Blob): string | null {
  if (blob.type && ALLOWED_MIMES.has(blob.type)) return blob.type;
  const ext = fileExtension(blobFileName(blob) ?? "");
  if (IMAGE_FILE_EXTENSIONS.includes(ext as (typeof IMAGE_FILE_EXTENSIONS)[number])) {
    return EXT_TO_MIME[ext] ?? null;
  }
  return null;
}

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

export async function resolveUploadMime(blob: Blob): Promise<string | null> {
  const fromMeta = resolveImageMimeFromMetadata(blob);
  if (fromMeta) return fromMeta;
  return sniffImageMime(blob);
}

export async function rollbackStoredUploads(uploaded: { publicId: string }[]) {
  await Promise.all(
    uploaded.map((item) =>
      deleteStoredImage(item.publicId).catch(() => {
        /* best-effort */
      })
    )
  );
}

export interface UploadedImageResult {
  url: string;
  publicId: string;
  mimeType: string;
  bytes: number;
  filename?: string;
}

export async function uploadImageBlobToStorage(
  file: Blob,
  folder: string
): Promise<UploadedImageResult> {
  const mime = await resolveUploadMime(file);
  if (!mime) {
    const label = blobFileName(file) ?? "upload";
    const t = file.type || "(empty)";
    throw new Error(`Unsupported type for "${label}" (${t}). Use JPEG, PNG, WebP, or GIF.`);
  }
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    const label = blobFileName(file) ?? "upload";
    throw new Error(`File too large: "${label}" (max ${MAX_IMAGE_UPLOAD_BYTES / 1024 / 1024} MB).`);
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const { url, publicId, bytes } = await saveImageBuffer(buf, folder, mimeForDataUri(mime));
  return {
    url,
    publicId,
    mimeType: mime,
    bytes,
    filename: blobFileName(file),
  };
}
