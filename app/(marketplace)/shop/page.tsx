"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Heart,
  Home,
  LayoutList,
  Leaf,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { AppLogo } from "@/components/branding/AppLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormatCurrency } from "@/components/providers/TenantProvider";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMarketplaceCartStore } from "@/store/marketplaceCartStore";
import type { ProductCategory } from "@/types";

type Row = {
  _id: string;
  name: string;
  slug: string;
  sku?: string;
  images: string[];
  retailPrice: number;
  category: string;
  stock: number;
};

const LIMIT = 12;

const CATS: { value: ProductCategory | ""; label: string; icon: ElementType }[] = [
  { value: "homecare", label: "Cleansers", icon: Home },
  { value: "cosmetics", label: "Toners", icon: Sparkles },
  { value: "wellness", label: "Serums", icon: Leaf },
  { value: "scent", label: "Moisturizers", icon: ShieldCheck },
  { value: "", label: "All Products", icon: Grid3X3 },
];

const SKIN_TYPES = ["All Skin Types", "Dry", "Oily", "Sensitive", "Combination", "Normal"];
const INGREDIENTS = ["Hyaluronic Acid", "Niacinamide", "Vitamin C", "Aloe Vera", "Tea Tree"];

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

function categoryLabel(value: string) {
  const match = CATS.find((cat) => cat.value === value);
  return match?.label ?? value;
}

export default function MarketplaceShopPage() {
  const money = useFormatCurrency();
  const { toast } = useToast();
  const addItem = useMarketplaceCartStore((s) => s.addItem);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<{ total: number; hasMore: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: String(LIMIT),
          search: debounced,
          category,
        });
        const res = await fetch(`/api/marketplace/products?${params}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to load");
        setRows(json.data ?? []);
        setMeta({ total: json.meta?.total ?? 0, hasMore: !!json.meta?.hasMore });
        setPage(p);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [debounced, category]
  );

  useEffect(() => {
    queueMicrotask(() => {
      void load(1);
    });
  }, [debounced, category, load]);

  const total = meta?.total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const showingStart = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const showingEnd = Math.min(page * LIMIT, total);
  const heroProducts = rows.slice(0, 3);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
    return counts;
  }, [rows]);

  const img = (r: Row) => r.images?.[0];
  const isRemote = (url: string) => /^https?:\/\//i.test(url);

  function addProductToCart(product: Row) {
    if (product.stock <= 0) {
      toast({ title: "Out of stock", variant: "destructive" });
      return;
    }
    addItem({
      productId: product._id,
      variantId: null,
      slug: product.slug,
      name: product.name,
      sku: product.sku ?? product.slug,
      price: product.retailPrice,
      image: img(product),
      maxStock: product.stock,
      quantity: 1,
    });
    toast({ title: "Added to cart", description: product.name });
  }

  return (
    <div className="-mx-4 -my-8 min-h-full px-4 py-8 font-[family-name:var(--font-plus-jakarta-sans)] text-[#2A4C6A]">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/60 bg-white/25 px-6 py-8 shadow-[0_24px_80px_rgba(94,70,135,0.18)] backdrop-blur-xl sm:px-10 lg:min-h-[340px]">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_70%_35%,rgba(255,255,255,0.68),transparent_24%),radial-gradient(circle_at_78%_48%,rgba(0,229,255,0.16),transparent_34%)]" />
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div className="max-w-md">
              <h1 className="font-[family-name:var(--font-playfair-display)] text-4xl font-semibold leading-tight text-[#1e3157] sm:text-5xl">
                Shop Our
                <span className="block font-[family-name:var(--font-great-vibes)] text-5xl font-normal text-[#d965c9] sm:text-6xl">
                  Glow Essentials
                </span>
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-7 text-[#2A4C6A]/85 sm:text-base">
                Premium skincare for healthy, radiant and glowing skin.
              </p>
              <Button
                className="mt-6 rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white shadow-[0_10px_30px_rgba(71,125,52,0.28)]"
                onClick={() =>
                  document.getElementById("shop-products")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Explore Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="relative hidden min-h-[260px] sm:block">
              <div className="absolute inset-x-[12%] top-[24%] h-32 rounded-full border border-white/50 bg-white/25 blur-[1px]" />
              <div className="absolute inset-x-[5%] bottom-2 h-16 rounded-[50%] bg-white/35 blur-2xl" />
              {heroProducts.map((product, index) => {
                const imageUrl = img(product);
                const positions = [
                  "left-[15%] top-[14%] h-56 w-36 rotate-[-4deg]",
                  "left-[42%] top-[2%] h-64 w-40",
                  "right-[8%] top-[28%] h-44 w-40 rotate-[5deg]",
                ];
                return (
                  <div
                    key={product._id}
                    className={`absolute ${positions[index]} overflow-hidden rounded-3xl border border-white/70 bg-white/55 p-3 shadow-[0_20px_55px_rgba(68,47,107,0.2)] backdrop-blur`}
                  >
                    <div className="relative h-full overflow-hidden rounded-2xl bg-white/60">
                      {imageUrl ? (
                        isRemote(imageUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Image src={imageUrl} alt="" fill className="object-cover" sizes="180px" />
                        )
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package className="h-12 w-12 text-[#6ea43f]" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {heroProducts.length === 0 && (
                <div className="absolute inset-8 flex items-center justify-center rounded-[2rem] border border-white/70 bg-white/35">
                  <Package className="h-20 w-20 text-[#6ea43f]/50" />
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 text-xs text-[#2A4C6A]/75 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="hover:text-[#2B6B56]">Home</Link>
            <span>/</span>
            <span className="font-semibold text-[#3c2e60]">Shop</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-white/70 bg-white/55 text-[#2A4C6A] lg:hidden"
              onClick={() => setFiltersOpen((o) => !o)}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              {filtersOpen ? "Hide filters" : "Filters"}
            </Button>
            <p className="text-center sm:text-right">
              Showing {showingStart}-{showingEnd} of {total} products
            </p>
            <Select defaultValue="featured">
              <SelectTrigger className="h-10 rounded-xl border-white/70 bg-white/55 text-[#2A4C6A] shadow-sm sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Sort by: Featured</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-center gap-2">
              <Button size="icon" className="h-10 w-10 rounded-xl bg-[#6ea43f] text-white">
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 rounded-xl border-white/70 bg-white/55 text-[#2A4C6A]"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div id="shop-products" className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside
            className={cn(
              "space-y-5 rounded-[1.5rem] border border-white/60 bg-white/45 p-5 shadow-[0_14px_40px_rgba(94,70,135,0.12)] backdrop-blur-xl",
              filtersOpen ? "block" : "hidden lg:block"
            )}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[#3c2e60]">Categories</h2>
              <SlidersHorizontal className="h-4 w-4 text-[#6ea43f]" />
            </div>
            <div className="space-y-2">
              {CATS.map((cat) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                    category === cat.value ? "bg-[#6ea43f]/15 text-[#2B6B56]" : "hover:bg-white/55"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <cat.icon className="h-4 w-4" />
                    {cat.label}
                  </span>
                  <span className="text-xs text-[#2A4C6A]/55">
                    {cat.value ? categoryCounts.get(cat.value) ?? 0 : total}
                  </span>
                </button>
              ))}
            </div>

            <div className="border-t border-[#3c2e60]/10 pt-5">
              <h3 className="mb-4 font-semibold text-[#3c2e60]">Search</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2A4C6A]/55" />
                <Input
                  className="h-11 rounded-xl border-white/70 bg-white/60 pl-9 text-[#2A4C6A]"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="border-t border-[#3c2e60]/10 pt-5">
              <h3 className="mb-4 font-semibold text-[#3c2e60]">Price Range</h3>
              <div className="h-1.5 rounded-full bg-[#6ea43f]/25">
                <div className="h-full w-4/5 rounded-full bg-[#6ea43f]" />
              </div>
              <div className="mt-2 flex justify-between text-xs">
                <span>₱249</span>
                <span>₱1,299</span>
              </div>
              <Button className="mt-4 w-full rounded-xl bg-violet-100 text-violet-700 hover:bg-violet-200">
                Filter
              </Button>
            </div>

            <div className="border-t border-[#3c2e60]/10 pt-5">
              <h3 className="mb-3 font-semibold text-[#3c2e60]">Skin Type</h3>
              <div className="space-y-2">
                {SKIN_TYPES.map((skin) => (
                  <label key={skin} className="flex items-center gap-2 text-xs text-[#2A4C6A]/75">
                    <Checkbox className="h-3.5 w-3.5 border-[#2A4C6A]/25" />
                    {skin}
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-[#3c2e60]/10 pt-5">
              <h3 className="mb-3 font-semibold text-[#3c2e60]">Key Ingredients</h3>
              <div className="space-y-2">
                {INGREDIENTS.map((item) => (
                  <label key={item} className="flex items-center gap-2 text-xs text-[#2A4C6A]/75">
                    <Checkbox className="h-3.5 w-3.5 border-[#2A4C6A]/25" />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl border-white/70 bg-white/55 text-violet-700"
              onClick={() => {
                setSearch("");
                setCategory("");
              }}
            >
              Clear All Filters
              <Trash2 className="ml-2 h-4 w-4" />
            </Button>
          </aside>

          <main className="min-w-0">
            {error && (
              <p className="mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            {loading && rows.length === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-80 rounded-3xl bg-white/45" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-3xl border border-dashed border-white/70 bg-white/35 py-20 text-center">
                <Package className="mb-3 h-10 w-10 text-[#2A4C6A]/45" />
                <p className="font-semibold text-[#3c2e60]">No products match your filters.</p>
                <p className="mt-1 text-sm text-[#2A4C6A]/70">Try another search or category.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {rows.map((r) => {
                    const imageUrl = img(r);
                    return (
                      <Card
                        key={r._id}
                        className="group overflow-hidden rounded-3xl border-white/65 bg-white/50 shadow-[0_14px_40px_rgba(94,70,135,0.14)] backdrop-blur transition duration-200 hover:-translate-y-1 hover:bg-white/70 hover:shadow-[0_20px_55px_rgba(94,70,135,0.2)]"
                      >
                        <Link href={`/product/${encodeURIComponent(r.slug)}`} className="block">
                          <div className="relative aspect-square overflow-hidden bg-white/35">
                            {imageUrl ? (
                              isRemote(imageUrl) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={imageUrl}
                                  alt=""
                                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                />
                              ) : (
                                <Image
                                  src={imageUrl}
                                  alt=""
                                  fill
                                  className="object-cover transition duration-500 group-hover:scale-105"
                                  sizes="(max-width:768px) 100vw, (max-width:1280px) 50vw, 25vw"
                                />
                              )
                            ) : (
                              <div className="flex h-full items-center justify-center text-[#2A4C6A]/45">
                                <Package className="h-12 w-12 opacity-40" />
                              </div>
                            )}
                            <span className="absolute right-3 top-3 rounded-full border border-white/70 bg-white/65 p-2 text-[#3c2e60] shadow-sm backdrop-blur">
                              <Heart className="h-4 w-4" />
                            </span>
                          </div>
                        </Link>
                        <CardContent className="space-y-2 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2A4C6A]/60">
                            {categoryLabel(r.category)}
                          </p>
                          <Link
                            href={`/product/${encodeURIComponent(r.slug)}`}
                            className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-[#3c2e60] hover:text-[#2B6B56]"
                          >
                            {r.name}
                          </Link>
                          <p className="text-sm font-bold text-[#1e3157]">{money(r.retailPrice)}</p>
                          <div className="flex items-center gap-1 text-[#FBC02D]">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-current" />
                            ))}
                            <span className="ml-1 text-[0.65rem] text-[#2A4C6A]/60">
                              ({Math.max(32, r.stock + 64)})
                            </span>
                          </div>
                          <Button
                            type="button"
                            className="mt-2 h-9 w-full rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-xs text-white"
                            disabled={r.stock <= 0}
                            onClick={() => addProductToCart(r)}
                          >
                            {r.stock <= 0 ? "Out of Stock" : "Add to Cart"}
                            <ShoppingBag className="ml-2 h-3.5 w-3.5" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="mt-6 flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-xl border-white/70 bg-white/55"
                    disabled={page <= 1 || loading}
                    onClick={() => void load(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 3) }).map((_, i) => {
                    const n = i + 1;
                    return (
                      <Button
                        key={n}
                        variant={page === n ? "default" : "outline"}
                        className={`h-10 w-10 rounded-xl ${
                          page === n
                            ? "bg-[#6ea43f] text-white"
                            : "border-white/70 bg-white/55 text-[#2A4C6A]"
                        }`}
                        disabled={loading}
                        onClick={() => void load(n)}
                      >
                        {n}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-xl border-white/70 bg-white/55"
                    disabled={page >= totalPages || loading}
                    onClick={() => void load(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </main>
        </div>

        <footer className="overflow-hidden rounded-[2rem] border border-white/60 bg-[#f6def8]/55 shadow-[0_18px_60px_rgba(94,70,135,0.16)] backdrop-blur-xl">
          <div className="grid gap-6 border-b border-white/55 p-5 sm:p-7 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
            <div className="space-y-4">
              <AppLogo size="lg" />
              <p className="max-w-xs text-sm leading-6 text-[#2A4C6A]/75">
                Glow naturally, wish beautifully. Premium skincare for your radiant confidence.
              </p>
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
            <span>
              Made with <span className="text-[#FF33CC]">♥</span> for your glow.
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
