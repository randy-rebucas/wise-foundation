"use client";

import { useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, GripVertical, Images, Link2, Loader2, Plus, X } from "lucide-react";
import { MediaPickerDialog } from "@/components/media/MediaPickerDialog";
import { useToast } from "@/hooks/use-toast";
import { deleteProductImagesFromStorage } from "@/lib/client/productImages";
import {
  IMAGE_UPLOAD_ACCEPT,
  MAX_GALLERY_IMAGES,
  MAX_IMAGE_UPLOAD_BYTES,
} from "@/lib/constants/gallery";
import { parseImageUrl } from "@/lib/utils/imageUrl";
import { reorderGalleryItems } from "@/lib/utils/gallery";
import { isManagedStorageUrl } from "@/lib/utils/storedImageUrl";
import { FileDropzone } from "@/components/shared/FileDropzone";
import { cn } from "@/lib/utils";

export { MAX_GALLERY_IMAGES as DEFAULT_MAX_GALLERY_IMAGES };

const thumbClass = {
  sm: "h-16 w-16",
  md: "h-20 w-20",
} as const;

interface ImageGalleryEditorProps {
  label?: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  onUploadFiles: (files: File[]) => Promise<void>;
  /** Number of files currently uploading (shows spinner placeholders). */
  pendingUploadCount?: number;
  maxImages?: number;
  uploading?: boolean;
  uploadEnabled?: boolean;
  size?: keyof typeof thumbClass;
  helperText?: string;
  /** When true, removing an image deletes the local file (if applicable). */
  deleteFromStorageOnRemove?: boolean;
}

export function ImageGalleryEditor({
  label = "Photos",
  images,
  onImagesChange,
  onUploadFiles,
  pendingUploadCount = 0,
  maxImages = MAX_GALLERY_IMAGES,
  uploading = false,
  uploadEnabled = true,
  size = "md",
  helperText,
  deleteFromStorageOnRemove = true,
}: ImageGalleryEditorProps) {
  const { toast } = useToast();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const totalCount = images.length + pendingUploadCount;
  const atLimit = totalCount >= maxImages;
  const thumb = thumbClass[size];
  const pickerDisabled = atLimit;

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

  function addImageFromUrl(explicitUrl?: string) {
    const parsed = parseImageUrl(explicitUrl ?? urlInput);
    if (!parsed) {
      toast({
        variant: "destructive",
        title: "Invalid URL",
        description: "Enter a valid image URL starting with http://, https://, or /uploads/",
      });
      return;
    }
    if (images.includes(parsed)) {
      toast({
        variant: "destructive",
        title: "Duplicate image",
        description: "This URL is already in the gallery.",
      });
      return;
    }
    if (atLimit) {
      toast({
        variant: "destructive",
        title: "Image limit reached",
        description: `You can add up to ${maxImages} images.`,
      });
      return;
    }
    onImagesChange([...images, parsed]);
    setUrlInput("");
    toast({ title: "Image added", description: "URL added to gallery." });
  }

  function handleUrlPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    const parsed = parseImageUrl(text);
    if (!parsed) return;
    e.preventDefault();
    if (images.includes(parsed) || atLimit) {
      setUrlInput(parsed);
      return;
    }
    addImageFromUrl(parsed);
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    e.target.value = "";
    if (!list?.length || pickerDisabled || !uploadEnabled) return;
    void handleUploadFiles(Array.from(list));
  }

  async function handleUploadFiles(files: File[]) {
    const room = maxImages - totalCount;
    if (!uploadEnabled) {
      toast({
        variant: "destructive",
        title: "Uploads unavailable",
        description: "Image upload is not available. Add an image URL or choose from the media library.",
      });
      return;
    }
    if (room <= 0) {
      toast({
        variant: "destructive",
        title: "Image limit reached",
        description: `You can add up to ${maxImages} images.`,
      });
      return;
    }
    await onUploadFiles(files.slice(0, room));
  }

  async function removeImage(index: number) {
    const url = images[index];
    if (!url) return;
    onImagesChange(images.filter((_, i) => i !== index));

    if (!deleteFromStorageOnRemove || !isManagedStorageUrl(url)) return;

    try {
      await deleteProductImagesFromStorage([url]);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not delete from storage",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    onImagesChange(reorderGalleryItems(images, index, target));
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOverItem(e: DragEvent, index: number) {
    e.preventDefault();
    setDropIndex(index);
  }

  function handleDropOnItem(e: DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    onImagesChange(reorderGalleryItems(images, dragIndex, index));
    setDragIndex(null);
    setDropIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDropIndex(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <span className="text-xs text-muted-foreground">
          {totalCount}/{maxImages}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="flex-1 min-w-0"
          disabled={uploading || atLimit}
          onPaste={handleUrlPaste}
          onBlur={() => {
            const trimmed = urlInput.trim();
            if (!trimmed) return;
            addImageFromUrl();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addImageFromUrl();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          disabled={uploading || atLimit || !urlInput.trim()}
          onClick={() => addImageFromUrl()}
        >
          <Link2 className="h-4 w-4 mr-2" />
          Add URL
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={uploading || atLimit}
          onClick={() => setLibraryOpen(true)}
        >
          <Images className="h-4 w-4 mr-2" />
          Library
        </Button>
      </div>

      <MediaPickerDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        selectedUrls={images}
        maxPick={maxImages}
        onConfirm={(urls) => {
          const merged = [...images];
          for (const url of urls) {
            if (!merged.includes(url) && merged.length < maxImages) merged.push(url);
          }
          onImagesChange(merged);
          toast({
            title: "Images added",
            description: `${urls.length} image(s) added from the media library.`,
          });
        }}
      />

      <input
        id={fileInputId}
        ref={fileInputRef}
        type="file"
        accept={IMAGE_UPLOAD_ACCEPT}
        multiple
          disabled={pickerDisabled || !uploadEnabled}
        className="sr-only"
        onChange={handleFileInputChange}
      />

      <FileDropzone
        accept={IMAGE_UPLOAD_ACCEPT}
        multiple
        maxFileSizeBytes={MAX_IMAGE_UPLOAD_BYTES}
        disabled={pickerDisabled || !uploadEnabled}
        busy={uploading}
        fileInputRef={fileInputRef}
        variant={size === "sm" ? "compact" : "default"}
        onFilesSelected={handleUploadFiles}
        onFilesRejected={rejectToast}
        idleLabel={
          uploading ? "Uploading… select more to add" : "Drag images here or click to browse"
        }
        activeLabel="Drop to upload"
        hint="Uploads start automatically when you select files"
      >
        {uploading ? (
          <>
            <Loader2
              className={`animate-spin text-primary ${size === "sm" ? "h-5 w-5" : "h-8 w-8"}`}
            />
            <span className={size === "sm" ? "text-xs font-medium" : "text-sm font-medium"}>
              Uploading…
            </span>
          </>
        ) : undefined}
      </FileDropzone>

      <ul className="flex flex-wrap gap-2 pt-1">
          {uploadEnabled && !atLimit && (
            <li>
              <button
                type="button"
                title="Add photos"
                aria-label="Add photos"
                disabled={pickerDisabled}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  thumb,
                  "flex flex-col items-center justify-center gap-0.5 rounded-md border border-dashed",
                  "border-muted-foreground/40 bg-muted/40 text-muted-foreground",
                  "hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors",
                  "disabled:pointer-events-none disabled:opacity-50"
                )}
              >
                <Plus className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
                <span className={size === "sm" ? "text-[0.6rem]" : "text-[0.65rem]"}>Add</span>
              </button>
            </li>
          )}
          {images.map((url, idx) => (
            <li
              key={`${url}-${idx}`}
              draggable={!uploading}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOverItem(e, idx)}
              onDrop={(e) => handleDropOnItem(e, idx)}
              onDragEnd={handleDragEnd}
              className={cn(
                "relative group rounded-md",
                dragIndex === idx && "opacity-50",
                dropIndex === idx && dragIndex !== null && dragIndex !== idx && "ring-2 ring-primary ring-offset-1"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className={`${thumb} rounded-md object-cover border bg-muted`}
              />
              {idx === 0 && (
                <Badge
                  variant="secondary"
                  className="absolute left-1 top-1 h-4 px-1 text-[0.6rem] font-medium shadow-sm"
                >
                  Cover
                </Badge>
              )}
              <div className="absolute left-0.5 bottom-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-5 w-5 rounded-full border shadow-sm p-0"
                  title="Move earlier"
                  aria-label="Move image earlier"
                  disabled={uploading || idx === 0}
                  onClick={() => moveImage(idx, -1)}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-5 w-5 rounded-full border shadow-sm p-0"
                  title="Move later"
                  aria-label="Move image later"
                  disabled={uploading || idx === images.length - 1}
                  onClick={() => moveImage(idx, 1)}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
              <span
                className="pointer-events-none absolute right-6 top-1 hidden text-muted-foreground group-hover:block sm:block"
                title="Drag to reorder"
                aria-hidden
              >
                <GripVertical className="h-3.5 w-3.5 drop-shadow-sm" />
              </span>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className={`absolute rounded-full shadow-sm border ${
                  size === "sm"
                    ? "-top-1.5 -right-1.5 h-5 w-5 p-0"
                    : "-top-2 -right-2 h-6 w-6"
                }`}
                title="Remove image"
                aria-label="Remove image"
                disabled={uploading}
                onClick={() => void removeImage(idx)}
              >
                <X className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
              </Button>
            </li>
          ))}
          {Array.from({ length: pendingUploadCount }, (_, i) => (
            <li
              key={`uploading-${i}`}
              className={`relative flex shrink-0 items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-muted/50 ${thumb}`}
              aria-label="Uploading image"
            >
              <Loader2
                className={`animate-spin text-primary ${size === "sm" ? "h-5 w-5" : "h-7 w-7"}`}
              />
            </li>
          ))}
      </ul>

      {images.length > 1 && (
        <p className="text-xs text-muted-foreground">
          Drag thumbnails to reorder. The first image is the cover shown in lists and the shop.
        </p>
      )}

      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}
