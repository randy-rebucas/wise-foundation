"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { isAllowedImageFile } from "@/lib/utils/imageFileAccept";

export type FileDropzoneRejectReason = "type" | "size";

function filterFilesByAccept(files: File[], accept?: string): File[] {
  return files.filter((file) => isAllowedImageFile(file, accept));
}

export interface FileDropzoneProps {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  busy?: boolean;
  maxFileSizeBytes?: number;
  onFilesSelected: (files: File[]) => void | Promise<void>;
  onFilesRejected?: (reason: FileDropzoneRejectReason, count: number) => void;
  fileInputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
  variant?: "default" | "compact";
  idleLabel?: string;
  activeLabel?: string;
  hint?: string;
  children?: ReactNode;
}

export function FileDropzone({
  accept,
  multiple = false,
  disabled = false,
  busy = false,
  maxFileSizeBytes,
  onFilesSelected,
  onFilesRejected,
  fileInputRef: externalInputRef,
  className,
  variant = "default",
  idleLabel = "Drag and drop files here, or click to browse",
  activeLabel = "Drop files to upload",
  hint,
  children,
}: FileDropzoneProps) {
  const inputId = useId();
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? internalInputRef;
  const usesExternalInput = Boolean(externalInputRef);
  const dragDepthRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const inputDisabled = disabled;

  const partitionFiles = useCallback(
    (incoming: File[]) => {
      const typeMatched = filterFilesByAccept(incoming, accept);
      const typeRejected = incoming.length - typeMatched.length;

      let sizeMatched = typeMatched;
      let sizeRejected = 0;
      if (maxFileSizeBytes != null) {
        sizeMatched = typeMatched.filter((f) => f.size <= maxFileSizeBytes);
        sizeRejected = typeMatched.length - sizeMatched.length;
      }

      if (typeRejected > 0) onFilesRejected?.("type", typeRejected);
      if (sizeRejected > 0) onFilesRejected?.("size", sizeRejected);

      return sizeMatched;
    },
    [accept, maxFileSizeBytes, onFilesRejected]
  );

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      console.log("[FileDropzone] processFiles called", { fileListLength: fileList?.length });
      const incoming = Array.from(fileList);
      console.log("[FileDropzone] incoming files", { count: incoming.length, files: incoming.map(f => ({ name: (f as File).name, size: (f as File).size })) });
      if (!incoming.length) {
        console.log("[FileDropzone] No incoming files, returning");
        return;
      }

      const matched = partitionFiles(incoming);
      console.log("[FileDropzone] After partition", { matchedCount: matched.length });
      if (!matched.length) {
        console.log("[FileDropzone] No matched files after partition");
        if (incoming.length > 0) onFilesRejected?.("type", incoming.length);
        return;
      }

      const selected = multiple ? matched : matched.slice(0, 1);
      console.log("[FileDropzone] Selected files to upload", { count: selected.length });
      await onFilesSelected(selected);
      console.log("[FileDropzone] onFilesSelected completed");
    },
    [multiple, onFilesSelected, partitionFiles]
  );

  const canPick = !inputDisabled && !usesExternalInput;

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (inputDisabled) return;
    dragDepthRef.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (inputDisabled) return;
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragging(false);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (inputDisabled) return;
    e.dataTransfer.dropEffect = "copy";
  }

  async function handleDrop(e: DragEvent) {
    console.log("[FileDropzone] Drop event", { filesCount: e.dataTransfer.files?.length });
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (inputDisabled) return;
    await processFiles(e.dataTransfer.files);
  }

  function openFilePicker() {
    if (inputDisabled) return;
    console.log("[FileDropzone] Opening file picker", { inputRef: inputRef.current });
    inputRef.current?.click();
  }

  const compact = variant === "compact";

  const zoneClassName = cn(
    "flex flex-col items-center justify-center rounded-lg border border-dashed text-center transition-colors",
    compact ? "gap-1.5 px-3 py-4" : "gap-2 px-4 py-8",
    inputDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
    busy && !inputDisabled && "border-primary bg-primary/10 ring-2 ring-primary/25",
    isDragging
      ? "border-primary bg-primary/5 text-primary"
      : "border-muted-foreground/35 bg-muted/30 hover:border-muted-foreground/55 hover:bg-muted/50"
  );

  return (
    <div className={cn("relative", className)}>
      {!usesExternalInput && (
        <input
          id={inputId}
          ref={internalInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={inputDisabled}
          className="sr-only"
          onChange={(e) => {
            const list = e.target.files;
            console.log("[FileDropzone] File input changed", { filesCount: list?.length });
            if (list?.length) {
              void processFiles(list);
            }
            e.target.value = "";
          }}
        />
      )}

      {canPick ? (
        <label
          htmlFor={inputId}
          className={zoneClassName}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {children ?? (
            <>
              <Upload className={cn("text-muted-foreground", compact ? "h-5 w-5" : "h-8 w-8")} />
              <span className={cn("font-medium text-foreground", compact ? "text-xs" : "text-sm")}>
                {isDragging ? activeLabel : idleLabel}
              </span>
              {hint && (
                <span className={cn("text-muted-foreground", compact ? "text-[0.65rem]" : "text-xs")}>
                  {hint}
                </span>
              )}
            </>
          )}
        </label>
      ) : (
        <div
          role="button"
          tabIndex={inputDisabled ? -1 : 0}
          onKeyDown={(e) => {
            if (inputDisabled) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openFilePicker();
            }
          }}
          onClick={() => {
            console.log("[FileDropzone] Div clicked, opening picker");
            openFilePicker();
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={zoneClassName}
        >
          {children ?? (
            <>
              <Upload className={cn("text-muted-foreground", compact ? "h-5 w-5" : "h-8 w-8")} />
              <span className={cn("font-medium text-foreground", compact ? "text-xs" : "text-sm")}>
                {isDragging ? activeLabel : idleLabel}
              </span>
              {hint && (
                <span className={cn("text-muted-foreground", compact ? "text-[0.65rem]" : "text-xs")}>
                  {hint}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
