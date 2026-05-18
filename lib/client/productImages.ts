import { parseJsonResponse } from "@/lib/client/parseJsonResponse";
import { isManagedStorageUrl } from "@/lib/utils/storedImageUrl";

/** Remove locally stored images for URLs (best-effort; ignores external URLs). */
export async function deleteProductImagesFromStorage(urls: string[]): Promise<void> {
  const storedUrls = urls.filter(isManagedStorageUrl);
  if (!storedUrls.length) return;

  const res = await fetch("/api/products/images", {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls: storedUrls }),
  });
  const data = await parseJsonResponse<{ success?: boolean; error?: string }>(res);
  if (!data.success) throw new Error(data.error ?? `Delete failed (${res.status})`);
}
