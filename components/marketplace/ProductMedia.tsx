"use client";

import Image from "next/image";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

function isRemote(url: string) {
  return /^https?:\/\//i.test(url);
}

export function ProductMedia({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority,
}: {
  src?: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-white/35 text-[#2A4C6A]/40",
          className
        )}
      >
        <Package className="h-16 w-16 opacity-50 sm:h-20 sm:w-20" aria-hidden />
      </div>
    );
  }

  if (isRemote(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={cn("object-cover", className)}
      sizes={sizes}
      priority={priority}
      unoptimized={src.startsWith("/uploads/")}
    />
  );
}
