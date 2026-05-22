import Image from "next/image";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

function isRemote(url: string) {
  return /^https?:\/\//i.test(url);
}

type MarketplaceFillImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

/** Fill-mode image for marketing layouts; supports remote URLs and local uploads. */
export function MarketplaceFillImage({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority,
}: MarketplaceFillImageProps) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-white/35 text-[#2A4C6A]/40",
          className
        )}
      >
        <Package className="h-12 w-12 opacity-50" aria-hidden />
      </div>
    );
  }

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
      sizes={sizes}
      priority={priority}
      unoptimized={src.startsWith("/uploads/")}
    />
  );
}
