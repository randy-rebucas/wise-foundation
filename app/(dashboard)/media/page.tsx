"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileDropzone } from "@/components/shared/FileDropzone";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useImageUploadEnabled } from "@/hooks/useImageUploadEnabled";
import {
  fetchMediaAssets,
  fetchMediaAssetUsage,
  uploadMediaFiles,
  deleteMediaAsset,
  formatMediaBytes,
  type MediaAssetRow,
} from "@/lib/client/media";
import {
  IMAGE_UPLOAD_ACCEPT,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_IMAGES_PER_UPLOAD_BATCH,
} from "@/lib/constants/gallery";
import {
  PendingUploadTiles,
  type PendingUploadItem,
} from "@/components/media/PendingUploadTiles";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Loader2, Search, Trash2, Images, Upload } from "lucide-react";

function formatUploadedAt(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function MediaPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    configured: uploadReady,
    isLoading: uploadStatusLoading,
    backend: uploadBackend,
    mediaLibraryFolder: libraryFolder,
    status: uploadStatus,
  } = useImageUploadEnabled();
  const cloudinaryError =
    uploadStatus?.cloudinary?.configured && !uploadStatus.cloudinary.ok
      ? uploadStatus.cloudinary.error
      : undefined;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [pageRequest, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUploadItem[]>([]);
  const pendingRef = useRef<PendingUploadItem[]>([]);
  const [preview, setPreview] = useState<MediaAssetRow | null>(null);

  const limit = 24;

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["media", pageRequest, debouncedSearch],
    queryFn: () =>
      fetchMediaAssets({ page: pageRequest, limit, search: debouncedSearch || undefined }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(pageRequest, totalPages);
  const hasSearch = debouncedSearch.length > 0;

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ["media-usage", preview?._id],
    queryFn: () => fetchMediaAssetUsage(preview!._id),
    enabled: !!preview?._id,
  });
  const usageCount = preview ? (usageData?.referenceCount ?? null) : null;

  useEffect(() => {
    pendingRef.current = pendingUploads;
  }, [pendingUploads]);

  useEffect(() => {
    return () => {
      for (const p of pendingRef.current) {
        URL.revokeObjectURL(p.previewUrl);
      }
    };
  }, []);

  const deleteMutation = useMutation({
    mutationFn: deleteMediaAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      toast({ title: "Media deleted" });
      setPreview(null);
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Delete failed", description: err.message }),
  });

  async function handleUpload(files: File[]) {
    if (!files.length) return;
    if (!uploadReady) {
      toast({
        variant: "destructive",
        title: "Upload unavailable",
        description: "Configure Cloudinary or local uploads before adding files.",
      });
      return;
    }

    let batch = files;
    if (batch.length > MAX_IMAGES_PER_UPLOAD_BATCH) {
      toast({
        variant: "destructive",
        title: "Too many files",
        description: `Only the first ${MAX_IMAGES_PER_UPLOAD_BATCH} files will be uploaded.`,
      });
      batch = batch.slice(0, MAX_IMAGES_PER_UPLOAD_BATCH);
    }

    const pending = batch.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPendingUploads((prev) => [...prev, ...pending]);

    function clearPending() {
      setPendingUploads((prev) => {
        const ids = new Set(pending.map((p) => p.id));
        return prev.filter((p) => !ids.has(p.id));
      });
      for (const p of pending) {
        URL.revokeObjectURL(p.previewUrl);
      }
    }

    setUploading(true);
    try {
      await uploadMediaFiles(batch);
      queryClient.invalidateQueries({ queryKey: ["media"] });
      setPage(1);
      toast({
        title: "Upload complete",
        description: `${batch.length} file(s) added to the library.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      clearPending();
      setUploading(false);
    }
  }

  function rejectToast(reason: "type" | "size", count: number) {
    toast({
      variant: "destructive",
      title: reason === "type" ? "Unsupported file type" : "File too large",
      description:
        reason === "type"
          ? `${count} file(s) skipped. Use JPEG, PNG, WebP, or GIF.`
          : `${count} file(s) skipped. Max ${MAX_IMAGE_UPLOAD_BYTES / 1024 / 1024} MB each.`,
    });
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "URL copied" });
    } catch {
      toast({ variant: "destructive", title: "Could not copy URL" });
    }
  }

  function handleDelete() {
    if (!preview) return;
    if (usageCount != null && usageCount > 0) {
      toast({
        variant: "destructive",
        title: "Cannot delete",
        description: `This image is used on ${usageCount} product(s) or variant(s). Remove it from those items first.`,
      });
      return;
    }
    if (!window.confirm("Delete this file from storage? This cannot be undone.")) return;
    deleteMutation.mutate(preview._id);
  }

  const hasPending = pendingUploads.length > 0;
  const showEmptyLibrary =
    !isLoading && items.length === 0 && !hasPending && !hasSearch;
  const showNoSearchResults =
    !isLoading && items.length === 0 && !hasPending && hasSearch;
  const showInitialLoading = isLoading && items.length === 0 && !hasPending;

  return (
    <RoleGuard
      requiredPermissions={["manage:products"]}
      allowedRoles={["ADMIN"]}
      fallback={
        <div className="space-y-2 p-6 py-10 text-sm text-muted-foreground">
          <p>
            You need the <span className="font-mono">manage:products</span> permission, or an{" "}
            <span className="font-mono">ADMIN</span> role, to use the media library.
          </p>
          <p>Sign out and sign in again after your role was updated.</p>
        </div>
      }
    >
      <div className="flex min-h-0 flex-col">
        <Header
          title="Media library"
          subtitle={
            hasPending
              ? `Uploading ${pendingUploads.length} file${pendingUploads.length === 1 ? "" : "s"}…`
              : "Upload and manage images for products and variants."
          }
        />

        <div className="flex-1 space-y-6 p-4 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,18.5rem)_1fr] lg:items-start xl:gap-8">
            <Card className="shrink-0 shadow-sm">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-base font-semibold">Add files</CardTitle>
                <CardDescription>
                  JPEG, PNG, WebP, or GIF · max {MAX_IMAGE_UPLOAD_BYTES / 1024 / 1024} MB per file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <FileDropzone
                  accept={IMAGE_UPLOAD_ACCEPT}
                  multiple
                  maxFileSizeBytes={MAX_IMAGE_UPLOAD_BYTES}
                  busy={uploading || hasPending}
                  onFilesSelected={handleUpload}
                  onFilesRejected={rejectToast}
                  idleLabel={uploading || hasPending ? "Uploading…" : "Drop files or click to browse"}
                  activeLabel="Drop to upload"
                  hint={`Up to ${MAX_IMAGES_PER_UPLOAD_BATCH} images per batch`}
                  className="w-full"
                >
                  {uploading || hasPending ? (
                    <>
                      <Loader2 className="h-7 w-7 animate-spin text-primary sm:h-8 sm:w-8" aria-hidden />
                      <span className="text-sm font-medium text-primary">
                        Uploading {pendingUploads.length} file
                        {pendingUploads.length === 1 ? "" : "s"}…
                      </span>
                      <span className="text-xs text-muted-foreground">Keep this page open</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-7 w-7 text-muted-foreground sm:h-8 sm:w-8" aria-hidden />
                      <span className="text-sm font-medium text-foreground">Add to library</span>
                    </>
                  )}
                </FileDropzone>
                {cloudinaryError ? (
                  <Alert variant="destructive" className="py-2">
                    <AlertDescription className="text-xs">{cloudinaryError}</AlertDescription>
                  </Alert>
                ) : null}
                {!uploadStatusLoading && !uploadReady && (
                  <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                    Uploads unavailable — set{" "}
                    <span className="font-mono text-[0.7rem] sm:text-xs">CLOUDINARY_URL</span> (or{" "}
                    <span className="font-mono text-[0.7rem] sm:text-xs">CLOUDINARY_CLOUD_NAME</span>,{" "}
                    <span className="font-mono text-[0.7rem] sm:text-xs">API_KEY</span>,{" "}
                    <span className="font-mono text-[0.7rem] sm:text-xs">API_SECRET</span>) on Vercel, or
                    use a writable <span className="font-mono text-[0.7rem] sm:text-xs">public/uploads</span>{" "}
                    directory locally.
                  </p>
                )}
                {(uploadStatusLoading || uploadReady) && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {uploadBackend === "cloudinary" ? (
                      <>
                        Stored in{" "}
                        <span className="font-mono text-[0.7rem] text-foreground/90 sm:text-xs">
                          Cloudinary
                        </span>{" "}
                        under folder{" "}
                        <span className="break-all font-mono text-[0.7rem] text-foreground/90 sm:text-xs">
                          {libraryFolder ?? "glowish/media/library"}
                        </span>
                      </>
                    ) : (
                      <>
                        Stored under{" "}
                        <span className="break-all font-mono text-[0.7rem] text-foreground/90 sm:text-xs">
                          public/uploads/{libraryFolder ?? "glowish/media/library"}
                        </span>
                      </>
                    )}
                  </p>
                )}
              </CardContent>
            </Card>

            <div
              className="flex min-h-[12rem] min-w-0 flex-col space-y-4 lg:min-h-0"
              aria-busy={uploading || hasPending}
            >
              <div className="space-y-0.5">
                <h2 className="text-base font-semibold tracking-tight text-foreground">Library</h2>
                <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
                  Search by filename or URL. Select a thumbnail to copy the URL or remove the file.
                </p>
              </div>

              <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="relative w-full sm:max-w-md">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by filename or URL…"
                    className="h-10 pl-9"
                    aria-label="Search media library"
                  />
                </div>
                {!isLoading && total > 0 && (
                  <p className="shrink-0 text-sm tabular-nums text-muted-foreground sm:text-right">
                    {total} file{total === 1 ? "" : "s"}
                    {hasSearch ? " matching" : ""}
                    {isFetching && !isLoading ? " · Updating…" : ""}
                  </p>
                )}
              </div>

              {isError && (
                <p className="text-sm text-destructive" role="alert">
                  {error instanceof Error ? error.message : "Failed to load media."}
                </p>
              )}

              <PendingUploadTiles items={pendingUploads} />

              {showInitialLoading ? (
                <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
                </div>
              ) : showEmptyLibrary ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/10 px-4 py-12 text-center text-muted-foreground">
                  <Images className="mb-3 h-11 w-11 opacity-40 sm:h-12 sm:w-12" aria-hidden />
                  <p className="max-w-sm text-sm leading-relaxed">
                    No media files yet. Use the panel on the left to upload images.
                  </p>
                </div>
              ) : showNoSearchResults ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/10 px-4 py-12 text-center text-muted-foreground">
                  <Search className="mb-3 h-10 w-10 opacity-40" aria-hidden />
                  <p className="text-sm">
                    No results for <span className="font-medium text-foreground">&ldquo;{debouncedSearch}&rdquo;</span>
                  </p>
                </div>
              ) : items.length > 0 ? (
                <>
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-5">
                    {items.map((item) => (
                      <li key={item._id} className="min-w-0">
                        <button
                          type="button"
                          className="group relative aspect-square w-full overflow-hidden rounded-md border border-border bg-muted text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          onClick={() => setPreview(item)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.url}
                            alt={item.filename ?? "Media"}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                            loading="lazy"
                            onError={(e) => {
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="flex items-center justify-center h-full w-full bg-muted text-muted-foreground text-xs font-medium">Failed to load</div>';
                              }
                            }}
                          />
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 pb-2 pt-8">
                            <p className="line-clamp-2 text-left text-[0.65rem] font-medium leading-tight text-white">
                              {item.filename ?? item.publicId.split("/").pop()}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>

                  {totalPages > 1 && (
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Previous
                      </Button>
                      <span className="min-w-[7rem] text-center text-sm tabular-nums text-muted-foreground">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : hasPending ? (
                <p className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 py-8 text-center text-sm text-muted-foreground">
                  Files will appear in the grid below when the upload finishes.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
          <DialogContent className="max-w-lg gap-0 p-0 sm:max-w-lg" aria-describedby={undefined}>
            <div className="space-y-4 p-6 pb-0">
              <DialogHeader>
                <DialogTitle className="truncate pr-8">
                  {preview?.filename ?? "Media preview"}
                </DialogTitle>
              </DialogHeader>
              {preview && (
                <div className="space-y-4">
                  <div className="aspect-square overflow-hidden rounded-md border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview.url}
                      alt={preview.filename ?? "Preview"}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  {usageLoading ? (
                    <p className="text-xs text-muted-foreground">Checking product usage…</p>
                  ) : usageCount != null && usageCount > 0 ? (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Used on {usageCount} product{usageCount === 1 ? "" : "s"} or variant
                      {usageCount === 1 ? "" : "s"}. Remove from those items before deleting.
                    </p>
                  ) : usageCount === 0 ? (
                    <p className="text-xs text-muted-foreground">Not used on any products.</p>
                  ) : null}
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <dt className="text-muted-foreground">Size</dt>
                    <dd>{formatMediaBytes(preview.bytes)}</dd>
                    <dt className="text-muted-foreground">Type</dt>
                    <dd>{preview.mimeType}</dd>
                    <dt className="text-muted-foreground">Uploaded</dt>
                    <dd>{formatUploadedAt(preview.createdAt)}</dd>
                    {preview.uploadedBy?.name || preview.uploadedBy?.email ? (
                      <>
                        <dt className="text-muted-foreground">By</dt>
                        <dd className="truncate">
                          {preview.uploadedBy?.name ?? preview.uploadedBy?.email}
                        </dd>
                      </>
                    ) : null}
                    <dt className="text-muted-foreground col-span-2">URL</dt>
                    <dd className="col-span-2 break-all font-mono text-[0.65rem]">{preview.url}</dd>
                  </dl>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 border-t bg-muted/30 px-6 py-4 sm:gap-0">
              <Button variant="outline" onClick={() => preview && copyUrl(preview.url)}>
                <Copy className="h-4 w-4 mr-2" />
                Copy URL
              </Button>
              <Button
                variant="destructive"
                disabled={
                  deleteMutation.isPending || usageLoading || (usageCount != null && usageCount > 0)
                }
                onClick={handleDelete}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
