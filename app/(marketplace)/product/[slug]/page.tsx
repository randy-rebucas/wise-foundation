"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormatCurrency } from "@/components/providers/TenantProvider";
import { WishlistButton } from "@/components/marketplace/WishlistButton";
import { useMarketplaceCartStore } from "@/store/marketplaceCartStore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { buildMarketplaceGalleryImages } from "@/lib/products/galleryImages";
import { resolveProductShortDescriptionMarkdown } from "@/lib/products/productCopy";
import { MarkdownContent } from "@/components/shared/MarkdownContent";
import { ShareButtons } from "@/components/shared/ShareButtons";
import { ProductImageGallery } from "@/components/marketplace/ProductImageGallery";
import { ProductReviewsSection } from "@/components/marketplace/reviews/ProductReviewsSection";
import { ProductReviewSummary } from "@/components/marketplace/reviews/ProductReviewSummary";
import { marketplaceCategoryLabel } from "@/lib/marketplace/categories";

type Variant = {
  _id: string;
  name: string;
  sku: string;
  retailPrice: number;
  stock: number;
  images: string[];
};

type Product = {
  _id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  category?: string;
  sku: string;
  images: string[];
  video?: string;
  retailPrice: number;
  baseStock: number;
  hasVariants: boolean;
  variants: Variant[];
};

function categoryLabel(value?: string) {
  if (!value) return null;
  return marketplaceCategoryLabel(value);
}

function ProductPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-28 rounded-[10px] bg-white/50" />
      <div className="overflow-hidden rounded-[10px] border border-white/60 bg-white/40 p-5 shadow-[0_18px_60px_rgba(94,70,135,0.14)] backdrop-blur-xl sm:p-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-[10px] bg-white/50" />
          <div className="space-y-4">
            <Skeleton className="h-5 w-24 rounded-full bg-white/50" />
            <Skeleton className="h-10 w-3/4 rounded-[10px] bg-white/50" />
            <Skeleton className="h-9 w-32 rounded-[10px] bg-white/50" />
            <Skeleton className="h-24 w-full rounded-[10px] bg-white/50" />
            <Skeleton className="h-11 w-full rounded-[10px] bg-white/50" />
            <Skeleton className="h-12 w-full rounded-[10px] bg-white/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketplaceProductPage() {
  const params = useParams();
  const slug = decodeURIComponent(String(params.slug ?? ""));
  const money = useFormatCurrency();
  const { toast } = useToast();
  const addItem = useMarketplaceCartStore((s) => s.addItem);
  const cartCount = useMarketplaceCartStore((s) => s.getCount());

  const [data, setData] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(`/api/marketplace/products/${encodeURIComponent(slug)}`);
        const json = await res.json();
        if (cancelled) return;
        if (!json.success) throw new Error(json.error ?? "Not found");
        const p = json.data as Product;
        setData(p);
        if (p.hasVariants && p.variants.length > 0) {
          const firstInStock = p.variants.find((v) => v.stock > 0) ?? p.variants[0];
          setVariantId(firstInStock._id);
        } else {
          setVariantId(null);
        }
        setQty(1);
        setActiveImageIdx(0);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const selectedVariant = useMemo(() => {
    if (!data?.hasVariants) return null;
    return data.variants.find((v) => v._id === variantId) ?? data.variants[0] ?? null;
  }, [data, variantId]);

  const price = selectedVariant ? selectedVariant.retailPrice : (data?.retailPrice ?? 0);
  const maxStock = selectedVariant ? selectedVariant.stock : (data?.baseStock ?? 0);
  const displaySku = selectedVariant ? selectedVariant.sku : (data?.sku ?? "");
  const lineTotal = price * qty;

  const galleryImages = useMemo(() => {
    if (!data) return [] as string[];
    return buildMarketplaceGalleryImages(data.images, selectedVariant?.images);
  }, [data, selectedVariant]);

  const displayImage = galleryImages[activeImageIdx] ?? galleryImages[0];

  useEffect(() => {
    setQty(1);
    setActiveImageIdx(0);
  }, [variantId]);

  useEffect(() => {
    if (activeImageIdx >= galleryImages.length) {
      setActiveImageIdx(0);
    }
  }, [galleryImages.length, activeImageIdx]);

  const stockStatus = useMemo(() => {
    if (maxStock <= 0) return { label: "Out of stock", tone: "out" as const };
    if (maxStock <= 5) return { label: `Only ${maxStock} left`, tone: "low" as const };
    return { label: "In stock", tone: "in" as const };
  }, [maxStock]);

  const addToCart = useCallback(() => {
    const p = data;
    if (!p) return;
    if (maxStock <= 0) {
      toast({ title: "Out of stock", variant: "destructive" });
      return;
    }
    const quantity = Math.min(Math.max(1, qty), maxStock);
    addItem({
      productId: p._id,
      variantId: selectedVariant?._id ?? null,
      slug: p.slug,
      name: p.name,
      variantName: selectedVariant?.name,
      sku: displaySku,
      price,
      image: displayImage,
      maxStock,
      quantity,
    });
    toast({
      title: "Added to cart",
      description: `${p.name}${selectedVariant ? ` (${selectedVariant.name})` : ""} · ${quantity} item${quantity === 1 ? "" : "s"}`,
    });
  }, [
    addItem,
    data,
    displayImage,
    displaySku,
    maxStock,
    price,
    qty,
    selectedVariant,
    toast,
  ]);

  if (loading) {
    return <ProductPageSkeleton />;
  }

  if (err || !data) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[10px] border border-white/60 bg-white/45 px-6 py-16 text-center shadow-[0_18px_60px_rgba(94,70,135,0.14)] backdrop-blur-xl">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm font-medium text-[#3c2e60]">{err || "Product not found"}</p>
        <p className="max-w-sm text-sm text-[#2A4C6A]/70">
          This item may be unavailable or no longer listed in the shop.
        </p>
        <Button
          asChild
          className="rounded-[10px] bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white"
        >
          <Link href="/shop">Browse shop</Link>
        </Button>
      </div>
    );
  }

  const catLabel = categoryLabel(data.category);
  const shortMarkdown = resolveProductShortDescriptionMarkdown(data);
  const fullDescription = data.description?.trim() ?? "";
  const showFullDescription =
    !!fullDescription && fullDescription.trim() !== (data.shortDescription?.trim() ?? "");

  return (
    <div className="space-y-5 font-[family-name:var(--font-plus-jakarta-sans)] text-[#2A4C6A]">
      <nav
        className="flex flex-wrap items-center gap-1 text-sm text-[#2A4C6A]/70"
        aria-label="Breadcrumb"
      >
        <Link href="/shop" className="hover:text-[#2B6B56] transition-colors">
          Shop
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
        <span className="truncate font-medium text-[#3c2e60]">{data.name}</span>
      </nav>

      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 gap-1 rounded-[10px] text-[#2A4C6A] hover:bg-white/50 hover:text-[#2B6B56]"
        asChild
      >
        <Link href="/shop">
          <ArrowLeft className="h-4 w-4" />
          Back to shop
        </Link>
      </Button>

      <article className="overflow-hidden rounded-[10px] border border-white/60 bg-white/40 shadow-[0_18px_60px_rgba(94,70,135,0.14)] backdrop-blur-xl">
        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-2 lg:gap-10">
          <div className="space-y-4">
            <ProductImageGallery
              images={galleryImages}
              activeIndex={activeImageIdx}
              onActiveIndexChange={setActiveImageIdx}
              productName={data.name}
            />
            {data.video ? (
              <div className="mx-auto w-full max-w-[220px] overflow-hidden rounded-[10px] border border-white/60 bg-black shadow-[0_10px_30px_rgba(94,70,135,0.18)]">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  src={data.video}
                  controls
                  playsInline
                  muted
                  className="aspect-[9/16] w-full object-cover"
                >
                  Your browser does not support video playback.
                </video>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              {catLabel ? (
                <Badge
                  variant="secondary"
                  className="rounded-full border border-white/60 bg-white/55 text-[#2A4C6A]"
                >
                  {catLabel}
                </Badge>
              ) : null}
              <Badge
                variant="secondary"
                className={cn(
                  "rounded-full border font-medium",
                  stockStatus.tone === "out" &&
                    "border-red-200/80 bg-red-50/90 text-red-700",
                  stockStatus.tone === "low" &&
                    "border-amber-200/80 bg-amber-50/90 text-amber-800",
                  stockStatus.tone === "in" &&
                    "border-emerald-200/80 bg-emerald-50/90 text-[#2B6B56]"
                )}
              >
                {stockStatus.label}
              </Badge>
              <span className="text-xs text-[#2A4C6A]/60">SKU {displaySku}</span>
            </div>

            <div>
              <h1 className="font-[family-name:var(--font-playfair-display)] text-3xl font-semibold leading-tight text-[#1e3157] sm:text-4xl">
                {data.name}
              </h1>
              <ProductReviewSummary productId={data._id} />
              {selectedVariant ? (
                <p className="mt-1 text-sm text-[#2A4C6A]/75">{selectedVariant.name}</p>
              ) : null}
              {shortMarkdown ? (
                <div className="mt-3 text-sm leading-relaxed text-[#2A4C6A]/85 [&_.markdown-content_p]:mb-2 [&_.markdown-content_p]:text-[#2A4C6A]/85 [&_.markdown-content_p]:last:mb-0 [&_.markdown-content_strong]:text-[#3c2e60] [&_.markdown-content_a]:text-[#2B6B56]">
                  <MarkdownContent content={shortMarkdown} />
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <p className="text-3xl font-bold text-[#1e3157]">{money(price)}</p>
              {qty > 1 ? (
                <p className="text-sm text-[#2A4C6A]/70">
                  {money(lineTotal)} total for {qty}
                </p>
              ) : null}
            </div>

            {showFullDescription ? (
              <section className="space-y-2" aria-labelledby="product-description-heading">
                <h2
                  id="product-description-heading"
                  className="text-sm font-semibold uppercase tracking-wide text-[#3c2e60]"
                >
                  Product details
                </h2>
                <div className="text-sm leading-relaxed text-[#2A4C6A]/85 [&_.markdown-content_p]:mb-3 [&_.markdown-content_p]:text-[#2A4C6A]/85 [&_.markdown-content_ul]:text-[#2A4C6A]/85 [&_.markdown-content_ol]:text-[#2A4C6A]/85 [&_.markdown-content_strong]:text-[#3c2e60] [&_.markdown-content_a]:text-[#2B6B56] [&_.markdown-content_h2]:text-[#3c2e60] [&_.markdown-content_h3]:text-[#3c2e60]">
                  <MarkdownContent content={fullDescription} />
                </div>
              </section>
            ) : null}

            {data.hasVariants && data.variants.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-[#3c2e60]">Variant</Label>
                <Select
                  value={variantId ?? ""}
                  onValueChange={(v) => setVariantId(v)}
                >
                  <SelectTrigger className="rounded-[10px] border-white/70 bg-white/60">
                    <SelectValue placeholder="Choose variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.variants.map((v) => (
                      <SelectItem key={v._id} value={v._id} disabled={v.stock <= 0}>
                        {v.name} — {money(v.retailPrice)}
                        {v.stock <= 0 ? " (out of stock)" : ` (${v.stock} available)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label className="text-[#3c2e60]">Quantity</Label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-[10px] border border-white/70 bg-white/70 shadow-sm">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-l-[10px]"
                    disabled={qty <= 1 || maxStock <= 0}
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums">
                    {qty}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-r-[10px]"
                    disabled={qty >= maxStock || maxStock <= 0}
                    onClick={() => setQty((q) => Math.min(maxStock, q + 1))}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-sm text-[#2A4C6A]/70">
                  {maxStock > 0 ? `${maxStock} available` : "Unavailable"}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="flex-1 gap-2 rounded-[10px] bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white shadow-[0_10px_30px_rgba(71,125,52,0.25)] hover:opacity-95"
                onClick={addToCart}
                disabled={maxStock <= 0}
              >
                <ShoppingCart className="h-4 w-4" />
                {maxStock <= 0 ? "Out of stock" : "Add to cart"}
              </Button>
              <WishlistButton
                productId={data._id}
                variantId={selectedVariant?._id ?? null}
                slug={data.slug}
                name={data.name}
                variantName={selectedVariant?.name}
                sku={displaySku}
                price={price}
                image={displayImage}
                className="h-11 w-11 shrink-0 rounded-[10px] border-white/70 bg-white/60"
              />
            </div>

            {cartCount > 0 ? (
              <Button
                variant="outline"
                className="w-full rounded-[10px] border-white/70 bg-white/55 text-[#2A4C6A] hover:bg-white/75"
                asChild
              >
                <Link href="/cart">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  View cart ({cartCount})
                </Link>
              </Button>
            ) : null}

            <ShareButtons
              url={`/product/${encodeURIComponent(data.slug)}`}
              title={data.name}
              description={data.shortDescription}
              className="pt-1"
            />
          </div>
        </div>
      </article>

      <ProductReviewsSection productId={data._id} productName={data.name} />
    </div>
  );
}
