import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/constants/gallery";
import { parseJsonResponse } from "@/lib/client/parseJsonResponse";

export interface MediaAssetRow {
  _id: string;
  url: string;
  publicId: string;
  filename?: string;
  mimeType: string;
  bytes: number;
  folder: string;
  createdAt: string;
  uploadedBy?: { name?: string; email?: string };
}

export async function fetchMediaAssets(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ items: MediaAssetRow[]; total: number; page: number; limit: number }> {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.search) sp.set("search", params.search);

  const res = await fetch(`/api/media?${sp}`, { credentials: "include" });
  const data = await parseJsonResponse<{
    success?: boolean;
    error?: string;
    data?: MediaAssetRow[];
    meta?: { page?: number; limit?: number; total?: number };
  }>(res);
  if (!data.success) throw new Error(data.error ?? `Failed to load media (${res.status})`);
  const page = data.meta?.page ?? params.page ?? 1;
  const limit = data.meta?.limit ?? params.limit ?? 24;
  return { items: data.data ?? [], total: data.meta?.total ?? 0, page, limit };
}

export async function fetchMediaAssetUsage(
  id: string
): Promise<{ referenceCount: number }> {
  const res = await fetch(`/api/media/${id}`, { credentials: "include" });
  const data = await parseJsonResponse<{
    success?: boolean;
    error?: string;
    data?: { referenceCount?: number };
  }>(res);
  if (!data.success) throw new Error(data.error ?? `Failed to load usage (${res.status})`);
  return { referenceCount: data.data?.referenceCount ?? 0 };
}

export async function uploadMediaFiles(files: File[]): Promise<MediaAssetRow[]> {
  const fd = new FormData();
  for (const f of files) fd.append("files", f);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const res = await fetch("/api/media", {
      method: "POST",
      body: fd,
      credentials: "include",
      signal: controller.signal,
    });
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
      throw new Error(
        res.status === 401 || res.status === 403
          ? "You do not have permission to upload (or your session expired). Sign in again."
          : `Upload failed (HTTP ${res.status}). Expected JSON from the server.`
      );
    }
    const data = await parseJsonResponse<{
      success?: boolean;
      error?: string;
      data?: { items?: MediaAssetRow[]; urls?: string[] };
    }>(res);
    if (!data.success) throw new Error(data.error ?? `Upload failed (${res.status})`);
    const items = data.data?.items;
    if (Array.isArray(items) && items.length > 0) return items;
    const urls = data.data?.urls;
    if (Array.isArray(urls) && urls.length > 0) {
      return urls.map((url, i) => ({
        _id: `pending-${i}`,
        url,
        publicId: "",
        mimeType: "image/jpeg",
        bytes: 0,
        folder: "",
        createdAt: new Date().toISOString(),
      }));
    }
    throw new Error("Upload completed but no media was returned.");
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Upload timed out. Try fewer or smaller images.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function deleteMediaAsset(id: string): Promise<void> {
  const res = await fetch(`/api/media/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await parseJsonResponse<{ success?: boolean; error?: string }>(res);
  if (!data.success) throw new Error(data.error ?? `Delete failed (${res.status})`);
}

export function formatMediaBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
