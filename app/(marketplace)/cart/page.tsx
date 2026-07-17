"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Heart,
  Lock,
  Package,
  ShoppingCart,
  Sparkles,
  Trash2,
} from "lucide-react";
import { ProductRatingBadge } from "@/components/marketplace/reviews/ProductRatingBadge";
import { useProductReviewSummaries } from "@/components/marketplace/reviews/useProductReviewSummaries";
import { MarketplaceFooter } from "@/components/marketplace/MarketplaceFooter";
import { MarketplacePageShell } from "@/components/marketplace/MarketplacePageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormatCurrency } from "@/components/providers/TenantProvider";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/providers/confirm-provider";
import { useMarketplaceCartStore } from "@/store/marketplaceCartStore";
import { useCategorySampleImages } from "@/components/marketplace/useCategorySampleImages";
import {
  pickCatalogImage,
  pickHeroFloatImages,
} from "@/lib/marketplace/categoryImages";
import { MARKETPLACE_STOCK_IMAGES } from "@/lib/marketplace/stockImages";

import {
  MARKETPLACE_FREE_SHIPPING_THRESHOLD,
  MARKETPLACE_FLAT_SHIPPING_FEE,
  computeCartStyleShipping,
} from "@/lib/utils/marketplaceShipping";

const FREE_SHIPPING_THRESHOLD = MARKETPLACE_FREE_SHIPPING_THRESHOLD;

type SuggestedProduct = {
  _id: string;
  name: string;
  slug: string;
  images: string[];
  retailPrice: number;
  stock: number;
};

export default function MarketplaceCartPage() {
  const money = useFormatCurrency();
  const { toast } = useToast();
  const confirm = useConfirm();
  const items = useMarketplaceCartStore((s) => s.items);
  const updateQty = useMarketplaceCartStore((s) => s.updateQty);
  const removeItem = useMarketplaceCartStore((s) => s.removeItem);
  const clear = useMarketplaceCartStore((s) => s.clear);
  const addItem = useMarketplaceCartStore((s) => s.addItem);
  const getSubtotal = useMarketplaceCartStore((s) => s.getSubtotal);
  const subtotal = getSubtotal();
  const itemCount = items.reduce((sum, line) => sum + line.quantity, 0);
  const shipping = computeCartStyleShipping(subtotal);
  const total = subtotal + shipping;
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShippingUnlocked = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  const [suggestions, setSuggestions] = useState<SuggestedProduct[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const suggestionIds = suggestions.map((p) => p._id);
  const { summaries: suggestionReviewSummaries } = useProductReviewSummaries(suggestionIds);
  const categorySamples = useCategorySampleImages();
  const heroImages = useMemo(
    () =>
      categorySamples
        ? pickHeroFloatImages(categorySamples, ["homecare", "wellness", "scent"])
        : [
            MARKETPLACE_STOCK_IMAGES.cleanser,
            MARKETPLACE_STOCK_IMAGES.serum,
            MARKETPLACE_STOCK_IMAGES.collection,
          ],
    [categorySamples]
  );
  const catalogFallback = categorySamples
    ? pickCatalogImage(categorySamples)
    : MARKETPLACE_STOCK_IMAGES.moisturizer;

  const loadSuggestions = useCallback(async () => {
    try {
      const res = await fetch("/api/marketplace/products?limit=8&page=1");
      const json = await res.json();
      if (json.success) setSuggestions(json.data ?? []);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadSuggestions();
    });
  }, [loadSuggestions]);

  const scrollSuggestions = (direction: "prev" | "next") => {
    const node = suggestionsRef.current;
    if (!node) return;
    const cardWidth = node.firstElementChild?.clientWidth ?? 240;
    node.scrollBy({
      left: direction === "next" ? cardWidth + 16 : -(cardWidth + 16),
      behavior: "smooth",
    });
  };

  const isRemote = (url: string) => /^https?:\/\//i.test(url);

  function lineImage(url: string | undefined) {
    return url || catalogFallback;
  }

  function addSuggestedToCart(product: SuggestedProduct) {
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
    <MarketplacePageShell gap="space-y-5">
        <section className="relative isolate overflow-hidden rounded-[10px] border border-white/60 bg-white/20 px-6 py-8 shadow-[0_24px_80px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:px-10 lg:min-h-[280px]">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_76%_44%,rgba(255,255,255,0.75),transparent_24%),radial-gradient(circle_at_88%_36%,rgba(255,51,204,0.16),transparent_36%)]" />
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
            <div>
              <h1 className="font-[family-name:var(--font-playfair-display)] text-4xl font-semibold text-[#1e3157] sm:text-5xl">
                Your Cart
              </h1>
              <div className="mt-3 flex items-center gap-2 text-sm text-[#2A4C6A]/70">
                <Link href="/" className="hover:text-[#2B6B56]">
                  Home
                </Link>
                <span>/</span>
                <span className="font-semibold text-[#3c2e60]">Cart</span>
              </div>
            </div>

            <div className="relative min-h-[220px] lg:min-h-[260px]">
              <div className="absolute inset-x-[8%] bottom-8 h-20 rounded-[50%] bg-white/45 blur-2xl" />
              {heroImages.map((image, index) => {
                const positions = [
                  "left-[16%] top-[24%] h-40 w-32 rotate-[-5deg]",
                  "left-[42%] top-[5%] h-52 w-36",
                  "right-[5%] top-[30%] h-44 w-40 rotate-[5deg]",
                ];
                return (
                  <div
                    key={image}
                    className={`absolute ${positions[index]} overflow-hidden rounded-[10px] border border-white/75 bg-white/65 p-2 shadow-[0_24px_65px_rgba(68,47,107,0.22)] backdrop-blur`}
                  >
                    <div
                      className="h-full rounded-[10px] bg-cover bg-center"
                      style={{ backgroundImage: `url(${image})` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {items.length === 0 ? (
          <section className="rounded-[10px] border border-white/65 bg-white/55 p-10 text-center shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl">
            <Package className="mx-auto mb-4 h-12 w-12 text-[#6ea43f]/70" />
            <h2 className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157]">
              Your cart is empty
            </h2>
            <p className="mt-2 text-sm text-[#2A4C6A]/75">
              Add a few Glowish favorites and come back when you are ready to checkout.
            </p>
            <Button className="mt-6 rounded-[10px] bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white" asChild>
              <Link href="/shop">
                Continue Shopping
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </section>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-5">
              <section className="overflow-hidden rounded-[10px] border border-white/65 bg-white/55 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl">
                <div className="border-b border-white/60 bg-emerald-50/80 px-5 py-3">
                  <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-emerald-100">
                    <div
                      className="h-full rounded-full bg-[#6ea43f] transition-all"
                      style={{ width: `${shippingProgress}%` }}
                    />
                  </div>
                  <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-2 font-semibold text-[#2B6B56]">
                      <CheckCircle2 className="h-4 w-4 text-[#6ea43f]" />
                      {freeShippingUnlocked
                        ? "Your order is eligible for FREE shipping!"
                        : "Add more to unlock free shipping"}
                    </p>
                    <p className="text-xs text-[#2A4C6A]/70">
                      {freeShippingUnlocked
                        ? "Enjoy complimentary delivery on this order."
                        : `${money(amountToFreeShipping)} more to unlock free shipping`}
                    </p>
                  </div>
                </div>

                <div className="hidden border-b border-white/60 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#2A4C6A]/60 md:grid md:grid-cols-[minmax(0,1.6fr)_0.7fr_0.8fr_0.7fr_2rem] md:gap-4">
                  <span>Product</span>
                  <span>Price</span>
                  <span className="text-center">Quantity</span>
                  <span className="text-right">Subtotal</span>
                  <span />
                </div>

                <div className="divide-y divide-white/60">
                  {items.map((line) => {
                    const imageUrl = lineImage(line.image);
                    return (
                      <article
                        key={`${line.productId}-${line.variantId ?? ""}`}
                        className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1.6fr)_0.7fr_0.8fr_0.7fr_2rem] md:items-center md:gap-4"
                      >
                        <div className="flex gap-4">
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[10px] border border-white/70 bg-white/60">
                            {isRemote(imageUrl) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={imageUrl} alt={line.name} className="h-full w-full object-cover" />
                            ) : (
                              <Image src={imageUrl} alt={line.name} fill className="object-cover" sizes="80px" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/product/${encodeURIComponent(line.slug)}`}
                              className="line-clamp-2 font-semibold text-[#1e3157] hover:text-[#2B6B56]"
                            >
                              {line.name}
                            </Link>
                            <p className="mt-1 text-xs text-[#2A4C6A]/65">
                              {line.variantName ?? "30ml"}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm font-semibold text-[#1e3157] md:text-center">
                          <span className="md:hidden text-xs text-[#2A4C6A]/60">Price: </span>
                          {money(line.price)}
                        </p>

                        <div className="flex items-center justify-start md:justify-center">
                          <div className="inline-flex items-center rounded-[10px] border border-white/70 bg-white/70 shadow-sm">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-l-[10px]"
                              onClick={() =>
                                updateQty(line.productId, line.variantId, line.quantity - 1)
                              }
                            >
                              −
                            </Button>
                            <span className="w-10 text-center text-sm font-semibold">
                              {line.quantity}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-r-[10px]"
                              onClick={() =>
                                updateQty(line.productId, line.variantId, line.quantity + 1)
                              }
                            >
                              +
                            </Button>
                          </div>
                        </div>

                        <p className="text-right text-sm font-bold text-[#1e3157]">
                          <span className="md:hidden text-xs font-normal text-[#2A4C6A]/60">
                            Subtotal:{" "}
                          </span>
                          {money(line.price * line.quantity)}
                        </p>

                        <div className="flex justify-end md:justify-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-pink-500 hover:bg-pink-50 hover:text-pink-600"
                            onClick={async () => {
                              const ok = await confirm({
                                title: "Remove this item from your cart?",
                                variant: "destructive",
                              });
                              if (ok) removeItem(line.productId, line.variantId);
                            }}
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-3 border-t border-white/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="outline"
                    className="rounded-[10px] border-violet-200 bg-violet-100/70 text-violet-700 hover:bg-violet-200"
                    asChild
                  >
                    <Link href="/shop">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Continue Shopping
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-pink-500 hover:bg-pink-50 hover:text-pink-600"
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Clear your cart?",
                        description: "This removes all items from your cart.",
                        variant: "destructive",
                        confirmText: "Clear Cart",
                      });
                      if (ok) clear();
                    }}
                  >
                    Clear Cart
                    <Trash2 className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </section>

              <section className="rounded-[10px] border border-white/65 bg-white/55 p-5 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-violet-500" />
                    <h2 className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157]">
                      You May Also Like
                    </h2>
                  </div>
                  <div className="hidden gap-2 sm:flex">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full border-white/70 bg-white/65"
                      onClick={() => scrollSuggestions("prev")}
                      aria-label="Previous suggestions"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full border-white/70 bg-white/65"
                      onClick={() => scrollSuggestions("next")}
                      aria-label="Next suggestions"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div
                  ref={suggestionsRef}
                  className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {suggestions.map((product, index) => {
                    const imageUrl =
                      product.images?.[0] || catalogFallback;
                    return (
                      <article
                        key={product._id}
                        className="min-w-[14rem] max-w-[14rem] snap-start rounded-[10px] border border-white/65 bg-white/60 p-3 shadow-sm"
                      >
                        <div className="relative mb-3 aspect-square overflow-hidden rounded-[10px] bg-white/50">
                          {isRemote(imageUrl) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <Image
                              src={imageUrl}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="180px"
                            />
                          )}
                          <span className="absolute right-2 top-2 rounded-full border border-white/70 bg-white/70 p-1.5 text-[#3c2e60]">
                            <Heart className="h-3.5 w-3.5" />
                          </span>
                        </div>
                        <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-[#1e3157]">
                          {product.name}
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#1e3157]">
                          {money(product.retailPrice)}
                        </p>
                        <ProductRatingBadge
                          summary={suggestionReviewSummaries[product._id]}
                          className="mt-2"
                        />
                        <Button
                          type="button"
                          className="mt-3 h-9 w-full rounded-[10px] bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-xs text-white"
                          disabled={product.stock <= 0}
                          onClick={() => addSuggestedToCart(product)}
                        >
                          Add to Cart
                          <ShoppingCart className="ml-2 h-3.5 w-3.5" />
                        </Button>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>

            <aside className="h-fit rounded-[10px] border border-white/65 bg-white/55 p-5 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl xl:sticky xl:top-24">
              <h2 className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157]">
                Order Summary
              </h2>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between text-[#2A4C6A]/80">
                  <span>Subtotal ({itemCount} items)</span>
                  <span className="font-semibold text-[#1e3157]">{money(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#2A4C6A]/80">
                  <span>Shipping</span>
                  <span className="font-semibold text-[#1e3157]">
                    {shipping === 0 ? "FREE" : money(shipping)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-white/60 pt-3 text-base font-bold text-[#1e3157]">
                  <span>Total</span>
                  <span>{money(total)}</span>
                </div>
              </div>

              <Button className="mt-5 h-12 w-full rounded-[10px] bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white" asChild>
                <Link href="/checkout">
                  <Lock className="mr-2 h-4 w-4" />
                  Proceed to Checkout
                </Link>
              </Button>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[#2A4C6A]/55">
                {["Visa", "Mastercard", "GCash", "PayPal"].map((label) => (
                  <span
                    key={label}
                    className="rounded-md border border-white/70 bg-white/65 px-2 py-1"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </aside>
          </div>
        )}

        <MarketplaceFooter />
    </MarketplacePageShell>
  );
}
