"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Package } from "lucide-react";
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shop</h1>
        <p className="text-muted-foreground mt-1">
          Browse products fulfilled from our warehouse. Prices include standard retail.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : (v as ProductCategory))}>
          <SelectTrigger className="w-full sm:w-[200px]">
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

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {loading && rows.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <Package className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">No products match your filters.</p>
          <p className="text-sm text-muted-foreground mt-1">Try another search or category.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {meta?.total ?? rows.length} product{(meta?.total ?? 0) === 1 ? "" : "s"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
              <Link key={r._id} href={`/product/${encodeURIComponent(r.slug)}`}>
                <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                  <div className="aspect-[4/3] bg-muted relative">
                    {img(r) ? (
                      isRemote(img(r)!) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img(r)} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Image src={img(r)!} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 33vw" />
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Package className="h-12 w-12 opacity-40" />
                      </div>
                    )}
                    {r.stock <= 0 && (
                      <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm font-semibold">
                        Out of stock
                      </span>
                    )}
                  </div>
                  <CardContent className="p-4 space-y-1">
                    <p className="text-xs uppercase text-muted-foreground">{r.category}</p>
                    <p className="font-semibold line-clamp-2 leading-snug">{r.name}</p>
                    <p className="text-lg font-bold text-primary">{money(r.retailPrice)}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {meta?.hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" disabled={loading} onClick={() => void load(page + 1, true)}>
                {loading ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
