import { deleteStoredVideo, saveVideoBuffer } from "@/lib/server/imageStorage";
import { MAX_VIDEO_UPLOAD_BYTES } from "@/lib/constants/gallery";
import { collectImageBlobParts, blobFileName } from "@/lib/server/imageUpload";

const ALLOWED_VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const EXT_TO_VIDEO_MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

/** Collect video file parts from multipart form data (supports `files` and `file` fields). */
export function collectVideoFilesFromFormData(formData: FormData): Blob[] {
  const parts = [...formData.getAll("files"), ...formData.getAll("file")];
  const fromFields = collectImageBlobParts(parts);
  if (fromFields.length > 0) return fromFields;

  const fallback: Blob[] = [];
  for (const [, value] of formData.entries()) {
    const batch = collectImageBlobParts([value]);
    fallback.push(...batch);
  }
  return fallback;
}

function resolveVideoMimeFromMetadata(blob: Blob): string | null {
  if (blob.type && ALLOWED_VIDEO_MIMES.has(blob.type)) return blob.type;
  const name = blobFileName(blob) ?? "";
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  return EXT_TO_VIDEO_MIME[ext] ?? null;
}

export interface UploadedVideoResult {
  url: string;
  publicId: string;
  mimeType: string;
  bytes: number;
  filename?: string;
}

export async function uploadVideoBlobToStorage(
  file: Blob,
  folder: string
): Promise<UploadedVideoResult> {
  const mime = resolveVideoMimeFromMetadata(file);
  if (!mime) {
    const label = blobFileName(file) ?? "upload";
    const t = file.type || "(empty)";
    throw new Error(`Unsupported type for "${label}" (${t}). Use MP4, WebM, or MOV.`);
  }
  if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
    const label = blobFileName(file) ?? "upload";
    throw new Error(`File too large: "${label}" (max ${MAX_VIDEO_UPLOAD_BYTES / 1024 / 1024} MB).`);
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const { url, publicId, bytes } = await saveVideoBuffer(buf, folder, mime);
  return {
    url,
    publicId,
    mimeType: mime,
    bytes,
    filename: blobFileName(file),
  };
}

export async function rollbackStoredVideoUploads(
  uploaded: { publicId: string; url?: string }[]
) {
  await Promise.all(
    uploaded.map((item) =>
      deleteStoredVideo(item.publicId, { url: item.url }).catch(() => {
        /* best-effort */
      })
    )
  );
}
