"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useFormatCurrency } from "@/components/providers/TenantProvider";
import { useToast } from "@/hooks/use-toast";
import { useMarketplaceCartStore } from "@/store/marketplaceCartStore";
import { marketplaceCategoryLabel } from "@/lib/marketplace/categories";
import { cloudinaryTransformedUrl } from "@/lib/utils/cloudinaryTransform";
import { isRemoteUrl, type HomeProductRow } from "./shared";
import type { MarketplaceAd } from "@/lib/services/marketplace.service";

const CARD_CLASS =
  "h-full overflow-hidden rounded-[10px] border-[#ece7f5] bg-white shadow-[0_2px_12px_rgba(94,70,135,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(94,70,135,0.14)]";

type HomeProductCardProps = {
  product: HomeProductRow;
  imageUrl: string;
};

function CardImage({ url, alt }: { url: string; alt: string }) {
  if (isRemoteUrl(url)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cloudinaryTransformedUrl(url, { width: 600, crop: "limit" })}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    );
  }
  return (
    <Image
      src={url}
      alt={alt}
      fill
      className="object-cover"
      sizes="(max-width:768px) 100vw, (max-width:1280px) 33vw, 300px"
    />
  );
}

export function HomeProductCard({ product, imageUrl }: HomeProductCardProps) {
  const money = useFormatCurrency();
  const { toast } = useToast();
  const addItem = useMarketplaceCartStore((s) => s.addItem);
  const secondImage = product.images && product.images.length > 1 ? product.images[1] : null;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) {
      toast({ title: "Out of stock", variant: "destructive" });
      return;
    }
    addItem({
      productId: product._id,
      variantId: null,
      slug: product.slug,
      name: product.name,
      sku: product.slug,
      price: product.retailPrice,
      image: product.images?.[0],
      maxStock: product.stock,
      quantity: 1,
    });
    toast({ title: "Added to cart", description: product.name });
  }

  return (
    <Link href={`/product/${encodeURIComponent(product.slug)}`} className="group block h-full">
      <Card className={CARD_CLASS}>
        <div className="relative aspect-[4/3] overflow-hidden bg-[#f7f5fb] [perspective:1200px]">
          {secondImage ? (
            <div className="relative h-full w-full will-change-transform transition-transform duration-700 [transition-timing-function:cubic-bezier(0.34,1.4,0.64,1)] [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] motion-reduce:transition-none">
              <div className="absolute inset-0 [backface-visibility:hidden]">
                <CardImage url={imageUrl} alt={product.name} />
              </div>
              <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <CardImage url={secondImage} alt={`${product.name} — alternate view`} />
              </div>
            </div>
          ) : isRemoteUrl(imageUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cloudinaryTransformedUrl(imageUrl, { width: 600, crop: "limit" })}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
              sizes="(max-width:768px) 100vw, (max-width:1280px) 33vw, 300px"
            />
          )}
          {product.stock <= 0 && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-semibold text-[#1f2a44] backdrop-blur-sm">
              Out of stock
            </span>
          )}
        </div>
        <CardContent className="space-y-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6ea43f]">
            {marketplaceCategoryLabel(product.category)}
          </p>
          <p className="line-clamp-2 font-semibold leading-snug text-[#1f2a44]">{product.name}</p>
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg font-bold text-[#2B6B56]">{money(product.retailPrice)}</p>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              aria-label={`Add ${product.name} to cart`}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-[10px] bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white shadow-sm transition hover:from-[#5f9636] hover:to-[#3f702e] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShoppingCart className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

type HomeSponsoredCardProps = {
  ad: MarketplaceAd;
  onPreview: (ad: MarketplaceAd) => void;
};

export function HomeSponsoredCard({ ad, onPreview }: HomeSponsoredCardProps) {
  const money = useFormatCurrency();

  return (
    <button
      type="button"
      onClick={() => onPreview(ad)}
      className="group relative cursor-pointer text-left"
    >
      <Card className={CARD_CLASS}>
        <div className="relative aspect-[4/3] overflow-hidden bg-[#f7f5fb]">
          <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-[10px] border border-white/70 bg-white/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#1f2a44] shadow-sm backdrop-blur">
            Sponsored
          </span>
          {ad.creativeType === "video" ? (
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
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          )}
        </div>
        <CardContent className="space-y-2 p-4">
          <p className="line-clamp-2 font-semibold leading-snug text-[#1f2a44]">
            {ad.headline ?? ad.product.name}
          </p>
          {ad.caption && <p className="line-clamp-2 text-xs text-[#64748b]">{ad.caption}</p>}
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg font-bold text-[#2B6B56]">{money(ad.product.price)}</p>
            <span className="rounded-[10px] bg-gradient-to-r from-[#6ea43f] to-[#477d34] px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
              View
            </span>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
