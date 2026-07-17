"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cloudinaryTransformedUrl } from "@/lib/utils/cloudinaryTransform";
import { useFormatCurrency } from "@/components/providers/TenantProvider";
import { AdPreviewDialog } from "@/components/marketplace/ads/AdPreviewDialog";
import type { MarketplaceAd } from "@/lib/services/marketplace.service";

type AdsCarouselProps = {
  initialAds: MarketplaceAd[];
};

export function AdsCarousel({ initialAds }: AdsCarouselProps) {
  const money = useFormatCurrency();
  const trackRef = useRef<HTMLDivElement>(null);
  const [previewAd, setPreviewAd] = useState<MarketplaceAd | null>(null);

  const scroll = (direction: "prev" | "next") => {
    const node = trackRef.current;
    if (!node) return;
    const cardWidth = node.firstElementChild?.clientWidth ?? 320;
    node.scrollBy({
      left: direction === "next" ? cardWidth + 16 : -(cardWidth + 16),
      behavior: "smooth",
    });
  };

  if (!initialAds.length) return null;

  return (
    <section
      aria-label="Sponsored products"
      className="rounded-[10px] border border-white/60 bg-white/35 p-5 shadow-[0_18px_60px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:p-7"
    >
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6ea43f]">
            Sponsored
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-playfair-display)] text-2xl font-semibold tracking-tight text-[#3c2e60]">
            Handpicked for you
          </h2>
        </div>
        <div className="hidden gap-2 sm:flex">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full border-white/70 bg-white/55 text-[#3c2e60] shadow-sm backdrop-blur hover:bg-white/75"
            onClick={() => scroll("prev")}
            aria-label="Previous sponsored product"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full border-white/70 bg-white/55 text-[#3c2e60] shadow-sm backdrop-blur hover:bg-white/75"
            onClick={() => scroll("next")}
            aria-label="Next sponsored product"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        ref={trackRef}
        className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {initialAds.map((ad) => (
          <button
            key={ad.id}
            type="button"
            onClick={() => setPreviewAd(ad)}
            className="group relative w-72 flex-shrink-0 snap-start overflow-hidden rounded-[10px] border border-white/65 bg-white/50 text-left shadow-[0_14px_40px_rgba(94,70,135,0.14)] backdrop-blur transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(94,70,135,0.2)]"
          >
            <Badge className="absolute left-3 top-3 z-10 gap-1 bg-white/85 text-[#3c2e60] shadow-sm backdrop-blur">
              <Megaphone className="h-3 w-3" />
              Sponsored
            </Badge>
            <div className="relative aspect-[4/3] overflow-hidden bg-white/35">
              {ad.creativeType === "video" ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  src={ad.creativeUrl}
                  poster={ad.posterUrl}
                  muted
                  autoPlay
                  loop
                  playsInline
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cloudinaryTransformedUrl(ad.creativeUrl, { width: 600, crop: "limit" })}
                  alt={ad.headline ?? ad.product.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              )}
            </div>
            <div className="space-y-2 p-4">
              <p className="line-clamp-2 font-semibold leading-snug text-[#3c2e60]">
                {ad.headline ?? ad.product.name}
              </p>
              {ad.caption && (
                <p className="line-clamp-2 text-xs text-[#2A4C6A]/70">{ad.caption}</p>
              )}
              <p className="text-lg font-bold text-[#2B6B56]">{money(ad.product.price)}</p>
            </div>
          </button>
        ))}
      </div>
      <AdPreviewDialog ad={previewAd} onOpenChange={(open) => !open && setPreviewAd(null)} />
    </section>
  );
}
