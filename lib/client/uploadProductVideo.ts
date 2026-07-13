import { parseJsonResponse } from "@/lib/client/parseJsonResponse";

const UPLOAD_TIMEOUT_MS = 120_000;

export async function uploadProductVideoFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("files", file);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const res = await fetch("/api/products/video", {
      method: "POST",
      body: fd,
      credentials: "include",
      signal: controller.signal,
    });
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
      throw new Error(
        res.status === 401 || res.status === 403
          ? "You do not have permission to upload video (or your session expired). Sign in again."
          : `Upload failed (HTTP ${res.status}). Expected JSON from the server.`
      );
    }
    const data = await parseJsonResponse<{
      success?: boolean;
      error?: string;
      data?: { url?: string };
    }>(res);
    if (!data.success || !data.data?.url) throw new Error(data.error ?? "Upload failed");
    return data.data.url;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Upload timed out. Try a smaller video.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
