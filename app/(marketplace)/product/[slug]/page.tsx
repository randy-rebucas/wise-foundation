"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Loader2, Minus, Package, Plus, ShoppingBag } from "lucide-react";
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
import { useFormatCurrency } from "@/components/providers/TenantProvider";
import { useMarketplaceCartStore } from "@/store/marketplaceCartStore";
import { useToast } from "@/hooks/use-toast";

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
  description?: string;
  sku: string;
  images: string[];
  retailPrice: number;
  baseStock: number;
  hasVariants: boolean;
  variants: Variant[];
};

export default function MarketplaceProductPage() {
  const params = useParams();
  const slug = decodeURIComponent(String(params.slug ?? ""));
  const router = useRouter();
  const money = useFormatCurrency();
  const { toast } = useToast();
  const addItem = useMarketplaceCartStore((s) => s.addItem);

  const [data, setData] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

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
        if (p.hasVariants && p.variants[0]) setVariantId(p.variants[0]._id);
        else setVariantId(null);
        setQty(1);
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

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="space-y-4 text-center py-16">
        <p className="text-destructive">{err || "Product not found"}</p>
        <Button asChild variant="outline">
          <Link href="/">Back to shop</Link>
        </Button>
      </div>
    );
  }

  const selectedVariant = data.hasVariants
    ? data.variants.find((v) => v._id === variantId) ?? data.variants[0]
    : null;
  const price = selectedVariant ? selectedVariant.retailPrice : data.retailPrice;
  const maxStock = selectedVariant ? selectedVariant.stock : data.baseStock;
  const displaySku = selectedVariant ? selectedVariant.sku : data.sku;
  const displayImage =
    (selectedVariant?.images?.[0] || data.images?.[0]) ?? undefined;
  const isRemote = (url: string) => /^https?:\/\//i.test(url);

  function addToCart() {
    const p = data;
    if (!p) return;
    if (maxStock <= 0) {
      toast({ title: "Out of stock", variant: "destructive" });
      return;
    }
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
      quantity: Math.min(qty, maxStock),
    });
    toast({ title: "Added to cart", description: p.name });
    router.push("/cart");
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-1 -ml-2" asChild>
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </Button>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square rounded-xl border bg-muted overflow-hidden relative">
          {displayImage ? (
            isRemote(displayImage) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <Image src={displayImage} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
            )
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-20 w-20 text-muted-foreground/40" />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Badge variant="secondary">{data.sku}</Badge>
          <h1 className="text-3xl font-bold tracking-tight">{data.name}</h1>
          <p className="text-3xl font-bold text-primary">{money(price)}</p>
          {data.description && (
            <p className="text-muted-foreground whitespace-pre-wrap">{data.description}</p>
          )}

          {data.hasVariants && (
            <div className="space-y-2">
              <Label>Variant</Label>
              <Select value={variantId ?? ""} onValueChange={(v) => setVariantId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose variant" />
                </SelectTrigger>
                <SelectContent>
                  {data.variants.map((v) => (
                    <SelectItem key={v._id} value={v._id} disabled={v.stock <= 0}>
                      {v.name} — {money(v.retailPrice)} ({v.stock} in stock)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Quantity</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={qty <= 1}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center font-medium">{qty}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={qty >= maxStock}
                onClick={() => setQty((q) => Math.min(maxStock, q + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{maxStock} available</span>
            </div>
          </div>

          <Button size="lg" className="w-full gap-2" onClick={addToCart} disabled={maxStock <= 0}>
            <ShoppingBag className="h-4 w-4" />
            Add to cart
          </Button>
        </div>
      </div>
    </div>
  );
}
