"use client";

import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cloudinaryTransformedUrl } from "@/lib/utils/cloudinaryTransform";
import { useFormatCurrency } from "@/components/providers/TenantProvider";
import type { MarketplaceAd } from "@/lib/services/marketplace.service";

type AdPreviewDialogProps = {
  ad: MarketplaceAd | null;
  onOpenChange: (open: boolean) => void;
};

export function AdPreviewDialog({ ad, onOpenChange }: AdPreviewDialogProps) {
  const money = useFormatCurrency();

  return (
    <Dialog open={ad !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden p-0 sm:max-w-3xl [&>button]:z-20 [&>button]:bg-black/40 [&>button]:text-white [&>button]:hover:bg-black/60">
        {ad && (
          <div className="relative aspect-video w-full overflow-hidden bg-black">
            <DialogTitle className="sr-only">{ad.headline ?? ad.product.name}</DialogTitle>

            <Badge className="absolute left-4 top-4 z-10 gap-1 bg-white/85 text-[#3c2e60] shadow-sm backdrop-blur">
              <Megaphone className="h-3 w-3" />
              Sponsored
            </Badge>

            {ad.creativeType === "video" ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                src={ad.creativeUrl}
                poster={ad.posterUrl}
                muted
                autoPlay
                loop
                playsInline
                controls
                className="h-full w-full object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cloudinaryTransformedUrl(ad.creativeUrl, { width: 1200, crop: "limit" })}
                alt={ad.headline ?? ad.product.name}
                className="h-full w-full object-contain"
              />
            )}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-5 pb-5 pt-16 sm:px-7 sm:pb-7">
              <div className="pointer-events-auto space-y-2">
                <p className="text-lg font-semibold leading-snug text-white sm:text-xl">
                  {ad.headline ?? ad.product.name}
                </p>
                {ad.caption && (
                  <p className="line-clamp-2 text-sm text-white/80">{ad.caption}</p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <p className="text-xl font-bold text-white">{money(ad.product.price)}</p>
                  <Button asChild size="sm">
                    <Link href={`/product/${encodeURIComponent(ad.product.slug)}`}>
                      View details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
