"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Package, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export default function MarketplaceShopPage() {
  const money = useFormatCurrency();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<{ total: number; hasMore: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <div className="-mx-4 -my-8 min-h-full px-4 py-8 text-[#2A4C6A]">
      <section className="mx-auto max-w-6xl rounded-[2rem] border border-white/60 bg-white/35 p-5 shadow-[0_24px_80px_rgba(94,70,135,0.18)] backdrop-blur-xl sm:p-7">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/45 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-[#2B6B56]">
              <Sparkles className="h-3.5 w-3.5" />
              Shop Glowish
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#3c2e60] sm:text-4xl">
              All skincare favorites
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#2A4C6A]/75">
              Browse products fulfilled from our warehouse. Search by name or SKU and filter by
              category.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:w-80">
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
                <Link key={r._id} href={`/product/${encodeURIComponent(r.slug)}`} className="group">
                  <Card className="h-full overflow-hidden rounded-3xl border-white/65 bg-white/50 shadow-[0_14px_40px_rgba(94,70,135,0.14)] backdrop-blur transition duration-200 hover:-translate-y-1 hover:bg-white/70 hover:shadow-[0_20px_55px_rgba(94,70,135,0.2)]">
                    <div className="relative aspect-[4/3] overflow-hidden bg-white/35">
                      {img(r) ? (
                        isRemote(img(r)!) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img(r)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
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
                      <span className="absolute right-3 top-3 rounded-full border border-white/70 bg-white/65 p-2 text-[#3c2e60] shadow-sm backdrop-blur">
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
    </div>
  );
}
