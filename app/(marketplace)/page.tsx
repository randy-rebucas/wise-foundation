"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Heart,
  Leaf,
  Mail,
  MessageCircle,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
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
import { AppLogo } from "@/components/branding/AppLogo";
import { useFormatCurrency } from "@/components/providers/TenantProvider";
import type { ProductCategory } from "@/types";

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
  { value: "homecare", label: "Homecare" },
  { value: "cosmetics", label: "Cosmetics" },
  { value: "wellness", label: "Wellness" },
  { value: "scent", label: "Scent" },
];

const CATEGORY_CARDS: {
  value: ProductCategory | "";
  label: string;
  detail: string;
  icon: ElementType;
  color: string;
}[] = [
    {
      value: "cosmetics",
      label: "Cosmetics",
      detail: "Glow essentials",
      icon: Sparkles,
      color: "from-pink-200/80 to-fuchsia-100/70 text-pink-700",
    },
    {
      value: "wellness",
      label: "Wellness",
      detail: "Care from within",
      icon: Leaf,
      color: "from-emerald-200/80 to-lime-100/70 text-emerald-700",
    },
    {
      value: "homecare",
      label: "Homecare",
      detail: "Fresh daily rituals",
      icon: ShieldCheck,
      color: "from-sky-200/80 to-blue-100/70 text-sky-700",
    },
    {
      value: "scent",
      label: "Scent",
      detail: "Soft signature notes",
      icon: Heart,
      color: "from-violet-200/80 to-purple-100/70 text-violet-700",
    },
  ];

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

const REVIEWS = [
  {
    name: "Angelica D.",
    title: "Verified buyer",
    avatar: "https://i.pravatar.cc/96?img=47",
    text: "Glowish products transformed my skin. It feels fresh, soft, and glowing every day.",
  },
  {
    name: "Rhealyn M.",
    title: "Verified buyer",
    avatar: "https://i.pravatar.cc/96?img=32",
    text: "The exfoliating bar is amazing. My skin feels smoother and brighter.",
  },
  {
    name: "Lara C.",
    title: "Verified buyer",
    avatar: "https://i.pravatar.cc/96?img=44",
    text: "Finally found skincare that suits my skin. Natural, effective, and worth every peso.",
  },
  {
    name: "Isabella S.",
    title: "Premium member",
    avatar: "https://i.pravatar.cc/96?img=49",
    text: "The products feel gentle and premium. My routine looks prettier and feels more consistent.",
  },
  {
    name: "Mika A.",
    title: "Verified buyer",
    avatar: "https://i.pravatar.cc/96?img=26",
    text: "Fast delivery, beautiful packaging, and the skincare gives such a clean glow.",
  },
];

const TRUST_PILLS = [
  "Natural ingredients",
  "Dermatologically tested",
  "Cruelty free",
];

const FOOTER_COLUMNS = [
  {
    title: "Shop",
    links: ["All Products", "Best Sellers", "New Arrivals", "Sale"],
  },
  {
    title: "Help",
    links: ["FAQs", "Shipping & Delivery", "Returns & Refunds", "Contact Us"],
  },
  {
    title: "Company",
    links: ["About Us", "Our Ingredients", "Reviews", "Privacy Policy"],
  },
];

const HERO_PRODUCT_POSITIONS = [
  "left-[8%] top-[18%] h-52 w-36 rotate-[-7deg] sm:h-64 sm:w-44",
  "left-[36%] top-[8%] h-60 w-40 sm:h-72 sm:w-48",
  "right-[7%] top-[22%] h-56 w-[9.5rem] rotate-[6deg] sm:h-[17rem] sm:w-44",
];

export default function MarketplaceCatalogPage() {
  const money = useFormatCurrency();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<{ total: number; hasMore: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const feedbackRef = useRef<HTMLDivElement>(null);

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
    queueMicrotask(() => {
      void load(1, false);
    });
  }, [debounced, category, load]);

  const img = (r: Row) => r.images?.[0];
  const isRemote = (url: string) => /^https?:\/\//i.test(url);
  const heroProducts = rows.slice(0, 3);
  const scrollFeedback = (direction: "prev" | "next") => {
    const node = feedbackRef.current;
    if (!node) return;
    const cardWidth = node.firstElementChild?.clientWidth ?? 320;
    node.scrollBy({
      left: direction === "next" ? cardWidth + 16 : -(cardWidth + 16),
      behavior: "smooth",
    });
  };

  return (
    <div className="overflow-hidden px-4 pb-6 pt-5 text-[#2A4C6A] sm:px-6">
      <div className="mx-auto max-w-7xl">
        <section className="relative isolate overflow-hidden sm:p-8 lg:min-h-[620px] lg:p-10">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_58%_20%,rgba(255,255,255,0.72),transparent_20%),radial-gradient(circle_at_75%_45%,rgba(0,229,255,0.2),transparent_34%),radial-gradient(circle_at_86%_56%,rgba(255,51,204,0.18),transparent_34%)]" />
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
            <div className="space-y-6">
              <div className="max-w-xl space-y-4">
                <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-[#2B6B56] sm:text-5xl lg:text-6xl">
                  Glow Naturally,
                  <span className="block font-sans text-5xl font-semibold italic text-[#d965c9] sm:text-6xl lg:text-7xl">
                    Wish Beautifully
                  </span>
                </h1>
                <p className="max-w-lg text-base leading-7 text-[#2A4C6A]/85 sm:text-lg">
                  Premium skincare crafted for healthy, radiant, and glowing skin. Shop soft,
                  effective formulas inspired by the Glowish full-page concept.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  className="h-12 rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] px-6 text-white shadow-[0_10px_30px_rgba(71,125,52,0.28)] hover:from-[#5f9636] hover:to-[#3f702e]"
                  onClick={() =>
                    document.getElementById("featured-products")?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Shop now
                  <ArrowRight className="ml-2 h-4 w-4" />
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

            <div className="relative min-h-[420px] lg:min-h-[560px]">
              <div className="absolute inset-x-[7%] top-[16%] h-64 rounded-full border border-white/45 bg-[radial-gradient(circle,rgba(255,255,255,0.42),rgba(0,229,255,0.08)_48%,transparent_70%)] blur-[1px]" />
              <div className="absolute inset-x-[4%] bottom-[14%] h-20 rounded-[50%] bg-white/30 blur-2xl" />
              {HERO_PRODUCT_POSITIONS.map((position, index) => {
                const product = heroProducts[index];
                const imageUrl = product ? img(product) : null;
                return (
                  <div
                    key={position}
                    className={`absolute ${position} overflow-hidden rounded-[1.4rem] border border-white/70 bg-white/58 p-3 shadow-[0_22px_50px_rgba(68,47,107,0.22)] backdrop-blur-md`}
                  >
                    <div className="relative h-full overflow-hidden rounded-[1rem] bg-gradient-to-br from-white/70 to-pink-100/60">
                      {imageUrl ? (
                        isRemote(imageUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Image src={imageUrl} alt="" fill className="object-cover" sizes="180px" />
                        )
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-[#6ea43f]">
                          <Package className="h-12 w-12" />
                          <span className="text-center text-xs font-semibold text-[#2B6B56]">
                            Glowish Care
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="absolute bottom-8 right-4 rounded-2xl border border-white/70 bg-white/58 p-4 shadow-lg backdrop-blur-md sm:right-10">
                <p className="text-sm font-semibold text-[#2B6B56]">Soft skincare aesthetic</p>
                <p className="mt-1 max-w-56 text-xs leading-5 text-[#2A4C6A]/80">
                  A page-wide Glowish look inspired by the provided mockup.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/60 bg-white/35 p-5 shadow-[0_18px_60px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:p-7">
          <div className="mb-5 flex flex-col gap-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6ea43f]">
              Shop by category
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-[#3c2e60]">
              Find your next Glowish ritual
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORY_CARDS.map((card) => (
              <button
                key={card.value || "all"}
                type="button"
                onClick={() => setCategory(card.value)}
                className="group rounded-2xl border border-white/65 bg-white/45 p-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/65 hover:shadow-lg"
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
          className="mt-8 rounded-[2rem] border border-white/60 bg-white/35 p-5 shadow-[0_18px_60px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:p-7"
        >
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6ea43f]">
                Featured products
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#3c2e60]">
                Beauty favorites ready to ship
              </h2>
              <p className="mt-1 text-sm text-[#2A4C6A]/75">
                Browse products fulfilled from our warehouse. Prices include standard retail.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2A4C6A]/55" />
                <Input
                  className="h-11 rounded-xl border-white/70 bg-white/55 pl-9 text-[#2A4C6A] shadow-sm placeholder:text-[#2A4C6A]/45 focus-visible:ring-[#00E5FF]/50"
                  placeholder="Search name or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select
                value={category || "all"}
                onValueChange={(v) => setCategory(v === "all" ? "" : (v as ProductCategory))}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-white/70 bg-white/55 text-[#2A4C6A] shadow-sm sm:w-[200px]">
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
                <Skeleton key={i} className="h-80 rounded-3xl bg-white/45" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/70 bg-white/35 py-20 text-center">
              <Package className="mb-3 h-10 w-10 text-[#2A4C6A]/45" />
              <p className="font-semibold text-[#3c2e60]">No products match your filters.</p>
              <p className="mt-1 text-sm text-[#2A4C6A]/70">Try another search or category.</p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-[#2A4C6A]/75">
                {meta?.total ?? rows.length} product{(meta?.total ?? 0) === 1 ? "" : "s"}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rows.map((r) => (
                  <Link
                    key={r._id}
                    href={`/product/${encodeURIComponent(r.slug)}`}
                    className="group"
                  >
                    <Card className="h-full overflow-hidden rounded-3xl border-white/65 bg-white/50 shadow-[0_14px_40px_rgba(94,70,135,0.14)] backdrop-blur transition duration-200 hover:-translate-y-1 hover:bg-white/70 hover:shadow-[0_20px_55px_rgba(94,70,135,0.2)]">
                      <div className="relative aspect-[4/3] overflow-hidden bg-white/35">
                        {img(r) ? (
                          isRemote(img(r)!) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={img(r)}
                              alt=""
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <Image
                              src={img(r)!}
                              alt=""
                              fill
                              className="object-cover transition duration-500 group-hover:scale-105"
                              sizes="(max-width:768px) 100vw, (max-width:1280px) 33vw, 25vw"
                            />
                          )
                        ) : (
                          <div className="flex h-full items-center justify-center text-[#2A4C6A]/45">
                            <Package className="h-12 w-12 opacity-40" />
                          </div>
                        )}
                        <span
                          className="absolute right-3 top-3 rounded-full border border-white/70 bg-white/65 p-2 text-[#3c2e60] shadow-sm backdrop-blur"
                          aria-label="View product"
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
                          {r.category}
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
                ))}
              </div>
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
          className="mt-8 grid gap-4 rounded-[2rem] border border-white/60 bg-white/35 p-5 shadow-[0_18px_60px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:p-7 md:grid-cols-2 lg:grid-cols-4"
        >
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="rounded-3xl border border-white/60 bg-white/40 p-5 backdrop-blur">
              <benefit.icon className="mb-4 h-8 w-8 text-[#6ea43f]" />
              <h3 className="font-semibold text-[#3c2e60]">{benefit.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#2A4C6A]/75">{benefit.description}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/60 bg-white/35 p-5 shadow-[0_18px_60px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6ea43f]">
                Customer feedback
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#3c2e60]">
                What our customers say
              </h2>
            </div>
            <div className="hidden gap-2 sm:flex">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full border-white/70 bg-white/55 text-[#3c2e60] shadow-sm backdrop-blur hover:bg-white/75"
                onClick={() => scrollFeedback("prev")}
                aria-label="Previous feedback"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full border-white/70 bg-white/55 text-[#3c2e60] shadow-sm backdrop-blur hover:bg-white/75"
                onClick={() => scrollFeedback("next")}
                aria-label="Next feedback"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <div
              ref={feedbackRef}
              className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Customer feedback carousel"
            >
              {REVIEWS.map((review) => (
                <article
                  key={review.name}
                  className="min-w-[82%] snap-start rounded-3xl border border-white/60 bg-white/50 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/65 hover:shadow-[0_18px_45px_rgba(94,70,135,0.16)] sm:min-w-[22rem] lg:min-w-[calc((100%_-_2rem)/3)]"
                >
                  <div className="mb-4 flex gap-0.5 text-[#FBC02D]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="min-h-[4.5rem] text-sm leading-6 text-[#2A4C6A]/80">
                    &ldquo;{review.text}&rdquo;
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={review.avatar}
                      alt={`${review.name} avatar`}
                      className="h-12 w-12 rounded-full border-2 border-white/80 object-cover shadow-sm"
                      loading="lazy"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[#3c2e60]">&mdash; {review.name}</p>
                      <p className="text-xs font-medium text-[#6ea43f]">{review.title}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-3 flex justify-center gap-1.5">
              {REVIEWS.map((review) => (
                <span
                  key={review.name}
                  className="h-1.5 w-6 rounded-full bg-[#6ea43f]/35"
                  aria-hidden
                />
              ))}
            </div>
          </div>
        </section>

        <footer className="mt-8 overflow-hidden rounded-[2rem] border border-white/60 bg-[#f6def8]/55 shadow-[0_18px_60px_rgba(94,70,135,0.16)] backdrop-blur-xl">
          <div className="grid gap-6 border-b border-white/55 p-5 sm:p-7 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
            <div className="space-y-4">
              <AppLogo size="lg" />
              <p className="max-w-xs text-sm leading-6 text-[#2A4C6A]/75">
                Glow naturally, wish beautifully. Premium skincare for your radiant confidence.
              </p>
              <div className="flex gap-2 text-[#2B6B56]">
                {[Heart, MessageCircle, Mail].map((Icon, index) => (
                  <span
                    key={index}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6ea43f] text-white shadow-sm"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                ))}
              </div>
            </div>
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="font-semibold text-[#3c2e60]">{column.title}</h3>
                <ul className="mt-4 space-y-2 text-sm text-[#2A4C6A]/75">
                  {column.links.map((link) => (
                    <li key={link}>{link}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 px-5 py-4 text-center text-xs text-[#2A4C6A]/65 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <span>© {new Date().getFullYear()} Glowish. All rights reserved.</span>
            <span>Made with <span className="text-[#FF33CC]">♥</span> for your glow.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
