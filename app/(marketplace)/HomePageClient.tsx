"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  FlaskConical,
  Heart,
  Leaf,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MarketplaceFooter } from "@/components/marketplace/MarketplaceFooter";
import { MarketplacePageShell } from "@/components/marketplace/MarketplacePageShell";
import dynamic from "next/dynamic";
const PublicReviewsCarousel = dynamic(
  () => import("@/components/marketplace/reviews/PublicReviewsCarousel").then((m) => m.PublicReviewsCarousel),
  { loading: () => <div className="h-48 animate-pulse rounded-2xl bg-white/30" /> }
);
import { useFormatCurrency } from "@/components/providers/TenantProvider";
import { PRODUCT_CATEGORIES } from "@/lib/products/catalog";
import { MARKETPLACE_CATEGORY_CARDS } from "@/lib/marketplace/categories";
import { MARKETPLACE_PRODUCT_STOCK } from "@/lib/marketplace/stockImages";
import {
  pickCategoryProductImage,
  pickHeroFloatImages,
} from "@/lib/marketplace/categoryImages";
import { cn } from "@/lib/utils";
import { cloudinaryTransformedUrl } from "@/lib/utils/cloudinaryTransform";
import type { ProductCategory } from "@/types";
import type { MarketplaceCategoryShowcase } from "@/lib/services/marketplace.service";

const VALID_CATEGORIES = new Set<ProductCategory>(["homecare", "cosmetics", "wellness", "scent"]);

type Row = {
  _id: string;
  name: string;
  slug: string;
  images: string[];
  retailPrice: number;
  category: string;
  stock: number;
};

const CATS: { value: ProductCategory | ""; label: string }[] = [
  { value: "", label: "All categories" },
  ...PRODUCT_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
];

function categoryLabel(value: string) {
  return PRODUCT_CATEGORIES.find((c) => c.value === value)?.label ?? value.replace(/_/g, " ");
}

const CATEGORY_CARDS = MARKETPLACE_CATEGORY_CARDS.map((c) => ({
  value: c.value,
  label: c.label,
  detail: c.description.split(".")[0] ?? c.description,
  icon: c.icon,
  color: c.homeColor,
}));

const BENEFITS = [
  {
    title: "Natural & safe",
    description: "Made with careful skin-friendly selections.",
    icon: Leaf,
  },
  {
    title: "Dermatologically tested",
    description: "Gentle formulas for confident daily routines.",
    icon: FlaskConical,
  },
  {
    title: "Visible glow",
    description: "Designed for soft, healthy-looking radiance.",
    icon: Sparkles,
  },
  {
    title: "Trusted quality",
    description: "Premium Glowish care shipped with confidence.",
    icon: ShieldCheck,
  },
];

const TRUST_PILLS = [
  "Natural ingredients",
  "Dermatologically tested",
  "Cruelty free",
];

const HERO_PRODUCT_POSITIONS = [
  "left-[8%] top-[18%] h-52 w-36 rotate-[-7deg] sm:h-64 sm:w-44",
  "left-[36%] top-[8%] h-60 w-40 sm:h-72 sm:w-48",
  "right-[7%] top-[22%] h-56 w-[9.5rem] rotate-[6deg] sm:h-[17rem] sm:w-44",
];

type HomePageClientProps = {
  initialProducts: Row[];
  initialMeta: { total: number; hasMore: boolean } | null;
  initialCategorySamples: MarketplaceCategoryShowcase | null;
};

export function HomePageClient({
  initialProducts,
  initialMeta,
  initialCategorySamples,
}: HomePageClientProps) {
  const money = useFormatCurrency();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>(initialProducts);
  const [meta, setMeta] = useState<{ total: number; hasMore: boolean } | null>(initialMeta);
  const [loading, setLoading] = useState(initialProducts.length === 0);
  const [error, setError] = useState("");

  // Skip the first auto-load if the server already provided data
  const skipNextLoad = useRef(initialProducts.length > 0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (p: number, append: boolean) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: "12",
          search: debounced,
          category,
        });
        const res = await fetch(`/api/marketplace/products?${params}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to load");
        const next: Row[] = json.data ?? [];
        const m = json.meta ?? { total: 0, hasMore: false };
        setMeta({ total: m.total ?? 0, hasMore: !!m.hasMore });
        setRows((prev) => (append ? [...prev, ...next] : next));
        setPage(p);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
        if (!append) setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [debounced, category]
  );

  useEffect(() => {
    if (skipNextLoad.current) {
      skipNextLoad.current = false;
      return;
    }
    void load(1, false);
  }, [load]);

  const categorySamples = initialCategorySamples;

  const heroCategoryImages = useMemo(
    () =>
      categorySamples
        ? pickHeroFloatImages(categorySamples, ["homecare", "wellness", "cosmetics"])
        : null,
    [categorySamples]
  );

  const img = (r: Row) => r.images?.[0];
  const isRemote = (url: string) => /^https?:\/\//i.test(url);

  function resolveProductImage(r: Row, index: number) {
    const direct = img(r);
    if (direct) return direct;
    const cat = VALID_CATEGORIES.has(r.category as ProductCategory)
      ? (r.category as ProductCategory)
      : null;
    if (categorySamples) return pickCategoryProductImage(categorySamples, cat);
    return MARKETPLACE_PRODUCT_STOCK[index % MARKETPLACE_PRODUCT_STOCK.length];
  }

  function heroSlotImage(index: number, product?: Row) {
    if (product) return resolveProductImage(product, index);
    return (
      heroCategoryImages?.[index] ??
      MARKETPLACE_PRODUCT_STOCK[index % MARKETPLACE_PRODUCT_STOCK.length]
    );
  }

  const heroProducts = rows.slice(0, 3);

  function ProductCardSkeleton() {
    return (
      <div className="overflow-hidden rounded-3xl border border-white/65 bg-white/50 shadow-[0_14px_40px_rgba(94,70,135,0.14)] backdrop-blur">
        <Skeleton className="aspect-[4/3] w-full rounded-none bg-white/60" />
        <div className="space-y-3 p-4">
          <Skeleton className="h-3 w-16 rounded-full bg-white/60" />
          <Skeleton className="h-4 w-full rounded-lg bg-white/60" />
          <Skeleton className="h-4 w-3/4 rounded-lg bg-white/60" />
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-6 w-20 rounded-lg bg-white/60" />
            <Skeleton className="h-7 w-14 rounded-full bg-white/60" />
          </div>
        </div>
      </div>
    );
  }

  function selectCategory(value: ProductCategory | "") {
    setCategory((prev) => (prev === value && value !== "" ? "" : value));
    setPage(1);
    document.getElementById("featured-products")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <MarketplacePageShell gap="space-y-8" className="pt-4 pb-8">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/60 bg-white/25 px-6 py-8 shadow-[0_24px_80px_rgba(94,70,135,0.18)] backdrop-blur-xl sm:px-10 lg:min-h-[580px] lg:py-12">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_58%_20%,rgba(255,255,255,0.72),transparent_20%),radial-gradient(circle_at_75%_45%,rgba(0,229,255,0.2),transparent_34%),radial-gradient(circle_at_86%_56%,rgba(255,51,204,0.18),transparent_34%)]" />
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
            <div className="space-y-6">
              <div className="max-w-xl space-y-4">
                <h1 className="font-[family-name:var(--font-playfair-display)] text-4xl font-semibold leading-tight tracking-tight text-[#2B6B56] sm:text-5xl lg:text-6xl">
                  Glowish
                  <span className="block font-[family-name:var(--font-great-vibes)] text-5xl font-normal text-[#d965c9] sm:text-6xl lg:text-7xl">
                    Get the Glow you wish
                  </span>
                </h1>
                <p className="max-w-lg text-base leading-7 text-[#2A4C6A]/85 sm:text-lg">
                  Premium skincare crafted for healthy, radiant skin. Discover cleansers, serums,
                  and daily essentials shipped from our fulfillment center.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  className="h-12 rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] px-6 text-white shadow-[0_10px_30px_rgba(71,125,52,0.28)] hover:from-[#5f9636] hover:to-[#3f702e]"
                  asChild
                >
                  <Link href="/shop">
                    Shop now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="h-12 rounded-xl border-white/70 bg-white/55 px-6 text-[#2A4C6A] shadow-sm backdrop-blur hover:bg-white/75"
                  onClick={() =>
                    document.getElementById("why-glowish")?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Learn more
                </Button>
              </div>
              <div className="grid max-w-xl gap-2 text-xs text-[#2A4C6A]/80 sm:grid-cols-3">
                {TRUST_PILLS.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-full border border-white/60 bg-white/40 px-3 py-2 backdrop-blur"
                  >
                    <Leaf className="h-3.5 w-3.5 text-[#6ea43f]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex min-h-[14rem] items-end justify-center overflow-hidden rounded-[2rem] border border-white/60 bg-white/35 p-4 md:hidden">
              {heroProducts[0] ? (
                <Link
                  href={`/product/${encodeURIComponent(heroProducts[0].slug)}`}
                  className="relative h-40 w-28 overflow-hidden rounded-2xl border border-white/70 shadow-lg"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cloudinaryTransformedUrl(heroSlotImage(0, heroProducts[0]), { width: 200, crop: "limit" })}
                    alt={heroProducts[0].name}
                    className="h-full w-full object-cover"
                  />
                </Link>
              ) : heroCategoryImages?.[0] ? (
                <div className="relative h-40 w-28 overflow-hidden rounded-2xl border border-white/70 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cloudinaryTransformedUrl(heroCategoryImages[0], { width: 200, crop: "limit" })}
                    alt="Featured from our catalog"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <Leaf className="h-16 w-16 text-[#6ea43f]/60" />
              )}
            </div>
            <div className="relative hidden min-h-[420px] md:block lg:min-h-[560px]">
              <div className="absolute inset-x-[7%] top-[16%] h-64 rounded-full border border-white/45 bg-[radial-gradient(circle,rgba(255,255,255,0.42),rgba(0,229,255,0.08)_48%,transparent_70%)] blur-[1px]" />
              <div className="absolute inset-x-[4%] bottom-[14%] h-20 rounded-[50%] bg-white/30 blur-2xl" />
              {HERO_PRODUCT_POSITIONS.map((position, index) => {
                const product = heroProducts[index];
                const imageUrl = heroSlotImage(index, product);
                const shellClass = `absolute ${position} overflow-hidden rounded-[1.4rem] border border-white/70 bg-white/58 p-3 shadow-[0_22px_50px_rgba(68,47,107,0.22)] backdrop-blur-md transition hover:shadow-[0_26px_58px_rgba(68,47,107,0.28)]`;
                const inner = (
                  <div className="relative h-full overflow-hidden rounded-[1rem] bg-gradient-to-br from-white/70 to-pink-100/60">
                    {isRemote(imageUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cloudinaryTransformedUrl(imageUrl, { width: 400, crop: "limit" })}
                        alt={product?.name ?? "Featured product"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Image
                        src={imageUrl}
                        alt={product?.name ?? "Featured product"}
                        fill
                        className="object-cover"
                        sizes="180px"
                      />
                    )}
                  </div>
                );
                return product ? (
                  <Link
                    key={product._id}
                    href={`/product/${encodeURIComponent(product.slug)}`}
                    className={shellClass}
                    aria-label={product.name}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={position} className={shellClass}>
                    {inner}
                  </div>
                );
              })}
              <div className="absolute bottom-8 right-4 rounded-2xl border border-white/70 bg-white/58 p-4 shadow-lg backdrop-blur-md sm:right-10">
                <p className="text-sm font-semibold text-[#2B6B56]">Curated for you</p>
                <p className="mt-1 max-w-56 text-xs leading-5 text-[#2A4C6A]/80">
                  {meta?.total
                    ? `${meta.total} products available online today.`
                    : "Fresh picks from our online catalog."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/60 bg-white/35 p-5 shadow-[0_18px_60px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:p-7">
          <div className="mb-5 flex flex-col gap-3 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6ea43f]">
                Shop by category
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-playfair-display)] text-2xl font-semibold tracking-tight text-[#3c2e60]">
                Find your next Glowish ritual
              </h2>
            </div>
            <Button variant="outline" className="rounded-xl border-white/70 bg-white/55" asChild>
              <Link href="/categories">View all categories</Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORY_CARDS.map((card) => (
              <button
                key={card.value || "all"}
                type="button"
                onClick={() => selectCategory(card.value)}
                className={cn(
                  "group rounded-2xl border bg-white/45 p-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/65 hover:shadow-lg",
                  category === card.value
                    ? "border-[#6ea43f]/60 ring-2 ring-[#6ea43f]/25"
                    : "border-white/65"
                )}
              >
                <span
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.color}`}
                >
                  <card.icon className="h-6 w-6" />
                </span>
                <p className="font-semibold text-[#3c2e60]">{card.label}</p>
                <p className="mt-1 text-xs text-[#2A4C6A]/75">{card.detail}</p>
              </button>
            ))}
          </div>
        </section>

        <section
          id="featured-products"
          className="scroll-mt-24 rounded-[2rem] border border-white/60 bg-white/35 p-5 shadow-[0_18px_60px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:p-7"
        >
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6ea43f]">
                Featured products
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-playfair-display)] text-2xl font-semibold tracking-tight text-[#3c2e60]">
                Beauty favorites ready to ship
              </h2>
              <p className="mt-1 text-sm text-[#2A4C6A]/75">
                Live catalog from our shop — search, filter, and add to cart on each product page.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2A4C6A]/55" />
                <Input
                  className="h-11 rounded-xl border-white/70 bg-white/55 pl-9 text-[#2A4C6A] shadow-sm placeholder:text-[#2A4C6A]/45 focus-visible:ring-[#00E5FF]/50"
                  placeholder="Search name or SKU..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select
                value={category || "all"}
                onValueChange={(v) =>
                  selectCategory(v === "all" ? "" : (v as ProductCategory))
                }
              >
                <SelectTrigger
                  className="h-11 w-full rounded-xl border-white/70 bg-white/55 text-[#2A4C6A] shadow-sm sm:w-[200px]"
                  aria-label="Filter by category"
                >
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATS.map((c) => (
                    <SelectItem key={c.value || "all"} value={c.value || "all"}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="h-11 shrink-0 rounded-xl border-white/70 bg-white/55 px-4 text-[#2A4C6A]"
                asChild
              >
                <Link href={category ? `/shop?category=${category}` : "/shop"}>
                  Full shop
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {error && (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {loading && rows.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/70 bg-white/35 py-20 text-center">
              <Package className="mb-3 h-10 w-10 text-[#2A4C6A]/45" />
              <p className="font-semibold text-[#3c2e60]">No products match your filters.</p>
              <p className="mt-1 text-sm text-[#2A4C6A]/70">Try another search or category.</p>
              <Button
                variant="outline"
                className="mt-4 rounded-xl border-white/70 bg-white/55"
                onClick={() => {
                  setSearch("");
                  setCategory("");
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[#2A4C6A]/75">
                <span>
                  {meta?.total ?? rows.length} product{(meta?.total ?? 0) === 1 ? "" : "s"}
                  {debounced || category ? " matching your filters" : ""}
                </span>
                {category ? (
                  <span className="rounded-full border border-[#6ea43f]/30 bg-[#6ea43f]/10 px-2.5 py-0.5 text-xs font-medium text-[#477d34]">
                    {categoryLabel(category)}
                  </span>
                ) : null}
                {debounced ? (
                  <span className="rounded-full border border-white/70 bg-white/55 px-2.5 py-0.5 text-xs text-[#2A4C6A]">
                    &ldquo;{debounced}&rdquo;
                  </span>
                ) : null}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rows.map((r, index) => {
                  const imageUrl = resolveProductImage(r, index);

                  return (
                  <Link
                    key={r._id}
                    href={`/product/${encodeURIComponent(r.slug)}`}
                    className="group"
                  >
                    <Card className="h-full overflow-hidden rounded-3xl border-white/65 bg-white/50 shadow-[0_14px_40px_rgba(94,70,135,0.14)] backdrop-blur transition duration-200 hover:-translate-y-1 hover:bg-white/70 hover:shadow-[0_20px_55px_rgba(94,70,135,0.2)]">
                      <div className="relative aspect-[4/3] overflow-hidden bg-white/35">
                        {isRemote(imageUrl) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={cloudinaryTransformedUrl(imageUrl, { width: 600, crop: "limit" })}
                              alt={r.name}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <Image
                              src={imageUrl}
                              alt={r.name}
                              fill
                              className="object-cover transition duration-500 group-hover:scale-105"
                              sizes="(max-width:768px) 100vw, (max-width:1280px) 33vw, 25vw"
                            />
                        )}
                        <span
                          className="absolute right-3 top-3 rounded-full border border-white/70 bg-white/65 p-2 text-[#3c2e60] shadow-sm backdrop-blur"
                          aria-hidden
                        >
                          <Heart className="h-4 w-4" />
                        </span>
                        {r.stock <= 0 && (
                          <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-semibold text-[#3c2e60] backdrop-blur-sm">
                            Out of stock
                          </span>
                        )}
                      </div>
                      <CardContent className="space-y-2 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6ea43f]">
                          {categoryLabel(r.category)}
                        </p>
                        <p className="line-clamp-2 font-semibold leading-snug text-[#3c2e60]">
                          {r.name}
                        </p>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-lg font-bold text-[#2B6B56]">{money(r.retailPrice)}</p>
                          <span className="rounded-full bg-gradient-to-r from-[#6ea43f] to-[#477d34] px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                            View
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  );
                })}
              </div>
              {loading && rows.length > 0 ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <ProductCardSkeleton key={`more-${i}`} />
                  ))}
                </div>
              ) : null}
              {meta?.hasMore && (
                <div className="flex justify-center pt-6">
                  <Button
                    variant="outline"
                    disabled={loading}
                    onClick={() => void load(page + 1, true)}
                    className="rounded-xl border-white/70 bg-white/55 text-[#2A4C6A] shadow-sm backdrop-blur hover:bg-white/75"
                  >
                    {loading ? "Loading..." : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>

        <section
          id="why-glowish"
          className="scroll-mt-24 grid gap-4 rounded-[2rem] border border-white/60 bg-white/35 p-5 shadow-[0_18px_60px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:p-7 md:grid-cols-2 lg:grid-cols-4"
        >
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="rounded-3xl border border-white/60 bg-white/40 p-5 backdrop-blur">
              <benefit.icon className="mb-4 h-8 w-8 text-[#6ea43f]" />
              <h3 className="font-semibold text-[#3c2e60]">{benefit.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#2A4C6A]/75">{benefit.description}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[2rem] border border-white/60 bg-white/35 p-5 shadow-[0_18px_60px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:p-7">
          <div className="mb-2">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6ea43f]">
              Customer feedback
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-playfair-display)] text-2xl font-semibold tracking-tight text-[#3c2e60]">
              What our customers say
            </h2>
          </div>
          <PublicReviewsCarousel limit={10} showAllLink />
        </section>

      <MarketplaceFooter showSocial />
    </MarketplacePageShell>
  );
}
