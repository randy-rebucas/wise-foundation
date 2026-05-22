"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function isRemote(url: string) {
  return /^https?:\/\//i.test(url);
}

function GalleryImage({
  src,
  alt,
  className,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (isRemote(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={cn("h-full w-full object-cover", className)} />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={cn("object-cover", className)}
      sizes={sizes ?? "(max-width:768px) 100vw, 50vw"}
      priority={priority}
    />
  );
}

export type ProductImageGalleryProps = {
  images: string[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  productName: string;
};

export function ProductImageGallery({
  images,
  activeIndex,
  onActiveIndexChange,
  productName,
}: ProductImageGalleryProps) {
  const count = images.length;
  const safeIndex = count === 0 ? 0 : Math.min(Math.max(0, activeIndex), count - 1);
  const displayImage = images[safeIndex];

  function go(delta: number) {
    if (count <= 1) return;
    onActiveIndexChange((safeIndex + delta + count) % count);
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/70 bg-white/50 shadow-inner">
        {displayImage ? (
          <>
            <GalleryImage
              src={displayImage}
              alt={productName}
              priority={safeIndex === 0}
              sizes="(max-width:1024px) 100vw, 50vw"
            />
            {count > 1 ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute left-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full border-white/70 bg-white/85 shadow-sm hover:bg-white"
                  onClick={() => go(-1)}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full border-white/70 bg-white/85 shadow-sm hover:bg-white"
                  onClick={() => go(1)}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-full bg-black/55 px-2.5 py-0.5 text-xs font-medium tabular-nums text-white">
                  {safeIndex + 1} / {count}
                </span>
              </>
            ) : null}
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-white/30">
            <Package className="h-20 w-20 text-[#2A4C6A]/25" aria-hidden />
          </div>
        )}
      </div>

      {count > 1 ? (
        <div
          className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory"
          role="tablist"
          aria-label="Product image thumbnails"
        >
          {images.map((url, idx) => (
            <button
              key={`${url}-${idx}`}
              type="button"
              role="tab"
              onClick={() => onActiveIndexChange(idx)}
              className={cn(
                "relative h-16 w-16 shrink-0 snap-start overflow-hidden rounded-xl border-2 transition-all",
                idx === safeIndex
                  ? "border-[#6ea43f] ring-2 ring-[#6ea43f]/30"
                  : "border-white/70 opacity-80 hover:opacity-100"
              )}
              aria-label={`View image ${idx + 1} of ${count}`}
              aria-selected={idx === safeIndex}
            >
              <GalleryImage src={url} alt="" sizes="64px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
