"use client";

import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/components/providers/TenantProvider";
import { fetchImageUploadStatus } from "@/lib/client/imageUploadStatus";

/** Local image upload availability (API check + tenant fallback). */
export function useImageUploadEnabled() {
  const { imageUploadEnabled: fromTenant } = useTenant();
  const { data: status, isLoading } = useQuery({
    queryKey: ["image-upload-status"],
    queryFn: fetchImageUploadStatus,
    staleTime: 60_000,
  });

  // Prefer live API status; while loading, trust server-rendered tenant flag (not `false` default).
  const configured = isLoading
    ? fromTenant
    : (status?.configured ?? fromTenant);

  return {
    configured,
    isLoading,
    backend: status?.backend,
    rootFolder: status?.rootFolder,
    mediaLibraryFolder: status?.mediaLibraryFolder,
    productCatalogFolder: status?.productCatalogFolder,
    storagePath: status?.storagePath,
  };
}
