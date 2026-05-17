"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PendingUploadItem {
  id: string;
  file: File;
  previewUrl: string;
}

interface PendingUploadTilesProps {
  items: PendingUploadItem[];
  className?: string;
  showHeader?: boolean;
}

export function PendingUploadTiles({
  items,
  className,
  showHeader = true,
}: PendingUploadTilesProps) {
  if (!items.length) return null;

  return (
    <section
      className={cn("space-y-3", className)}
      aria-label="Uploads in progress"
      aria-busy="true"
    >
      {showHeader && (
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5 shadow-sm">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Uploading {items.length} file{items.length === 1 ? "" : "s"}…
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {items.map((p) => p.file.name).join(", ")}
            </p>
          </div>
          <div
            className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-primary/20"
            aria-hidden
          >
            <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
          </div>
        </div>
      )}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 xl:grid-cols-5">
        {items.map((pending) => (
          <li
            key={pending.id}
            className="relative aspect-square overflow-hidden rounded-md border-2 border-dashed border-primary/50 bg-muted/50 shadow-sm ring-2 ring-primary/15"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pending.previewUrl}
              alt={pending.file.name}
              className="h-full w-full object-cover opacity-60"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/60 backdrop-blur-[1px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
              <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary">
                Uploading
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 pt-6">
              <p className="text-[0.65rem] text-white truncate text-left font-medium">
                {pending.file.name}
              </p>
              <p className="text-[0.6rem] text-white/80">
                {(pending.file.size / 1024).toFixed(0)} KB
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
