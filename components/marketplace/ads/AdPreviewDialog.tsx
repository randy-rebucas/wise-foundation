"use client";

import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
      <DialogContent className="max-w-xl overflow-hidden p-0">
        {ad && (
          <>
            <div className="relative aspect-video w-full overflow-hidden bg-black/5">
              <Badge className="absolute left-3 top-3 z-10 gap-1 bg-white/85 text-[#3c2e60] shadow-sm backdrop-blur">
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
                  src={cloudinaryTransformedUrl(ad.creativeUrl, { width: 1000, crop: "limit" })}
                  alt={ad.headline ?? ad.product.name}
                  className="h-full w-full object-contain"
                />
              )}
            </div>
            <div className="space-y-3 px-6 pb-6 pt-2">
              <DialogHeader className="space-y-1">
                <DialogTitle>{ad.headline ?? ad.product.name}</DialogTitle>
              </DialogHeader>
              {ad.caption && <p className="text-sm text-muted-foreground">{ad.caption}</p>}
              <p className="text-xl font-bold text-[#2B6B56]">{money(ad.product.price)}</p>
              <DialogFooter>
                <Button asChild className="w-full sm:w-auto">
                  <Link href={`/product/${encodeURIComponent(ad.product.slug)}`}>
                    View details
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </DialogFooter>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
