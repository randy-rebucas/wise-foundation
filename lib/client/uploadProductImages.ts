import { parseJsonResponse } from "@/lib/client/parseJsonResponse";

const UPLOAD_TIMEOUT_MS = 120_000;

export async function uploadProductImageFiles(files: File[]): Promise<string[]> {
  const fd = new FormData();
  for (const f of files) fd.append("files", f);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const res = await fetch("/api/products/images", {
      method: "POST",
      body: fd,
      credentials: "include",
      signal: controller.signal,
    });
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
      throw new Error(
        res.status === 401 || res.status === 403
          ? "You do not have permission to upload images (or your session expired). Sign in again."
          : `Upload failed (HTTP ${res.status}). Expected JSON from the server.`
      );
    }
    const data = await parseJsonResponse<{
      success?: boolean;
      error?: string;
      data?: { urls?: string[]; items?: { url?: string }[] };
    }>(res);
    if (!data.success) throw new Error(data.error ?? "Upload failed");
    const urls =
      data.data?.urls ??
      data.data?.items
        ?.map((item) => item.url)
        .filter((url): url is string => typeof url === "string" && url.length > 0);
    if (!Array.isArray(urls) || urls.length === 0) {
      throw new Error("Upload completed but no image URLs were returned.");
    }
    return urls;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Upload timed out. Try fewer or smaller images.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
