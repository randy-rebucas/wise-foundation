export interface ImageUploadStatus {
  configured: boolean;
  backend?: "cloudinary" | "local";
  uploadUrlPrefix?: string;
  storagePath?: string;
  rootFolder?: string;
  mediaLibraryFolder?: string;
  productCatalogFolder?: string;
}

export async function fetchImageUploadStatus(): Promise<ImageUploadStatus> {
  const res = await fetch("/api/products/images/status", {
    credentials: "include",
    cache: "no-store",
  });
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return { configured: false };
  }
  const data = (await res.json()) as {
    success?: boolean;
    data?: ImageUploadStatus;
  };
  if (!data.success || !data.data) return { configured: false };
  return data.data;
}

export async function fetchImageUploadConfigured(): Promise<boolean> {
  const status = await fetchImageUploadStatus();
  return status.configured;
}
