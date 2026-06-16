"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Package, ShoppingCart, Loader2, Plus, Minus } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useFormatCurrency } from "@/components/providers/TenantProvider";
import type { ProductCategory } from "@/types";

interface POSVariant {
  _id: string;
  name: string;
  sku: string;
  attributes: { key: string; value: string }[];
  retailPrice: number;
  stock: number;
}

interface POSProduct {
  _id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  retailPrice: number;
  images: string[];
  stock: number;
  variants: POSVariant[];
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

interface ProductGridProps {
  products: POSProduct[];
  branchId: string;
}

const CATEGORY_FILTERS = [
  { value: "all", label: "All" },
  { value: "homecare", label: "Home Care" },
  { value: "cosmetics", label: "Cosmetics" },
  { value: "wellness", label: "Wellness" },
  { value: "scent", label: "Scents" },
];

export function ProductGrid({ products, branchId }: ProductGridProps) {
  const formatMoney = useFormatCurrency();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [variantProduct, setVariantProduct] = useState<POSProduct | null>(null);
  const [bulkProduct, setBulkProduct] = useState<POSProduct | null>(null);
  const [bulkQty, setBulkQty] = useState(1);
  const [variantQtys, setVariantQtys] = useState<Record<string, number>>({});
  const [searchFocused, setSearchFocused] = useState(false);
  const { addItem, items } = useCartStore();

  const debouncedSearch = useDebouncedValue(search.trim(), 280);
  const {
    data: searchHits = [],
    isFetching: posSearchLoading,
    isError: isPosSearchError,
    error: posSearchError,
  } = useQuery({
    queryKey: ["pos-product-suggest", branchId, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        branchId,
        search: debouncedSearch,
      });
      const res = await fetch(`/api/products/pos?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Product search failed (${res.status})`);
      return (data.data ?? []) as POSProduct[];
    },
    enabled: !!branchId && debouncedSearch.length >= 2,
    staleTime: 15_000,
  });

  const showSuggestDropdown =
    searchFocused && !!branchId && debouncedSearch.length >= 2;

  const filtered = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || p.category === category;
    return matchesSearch && matchesCategory;
  });

  function handleProductClick(product: POSProduct) {
    if (product.stock === 0 && product.variants.every((v) => v.stock === 0)) return;
    if (product.variants.length > 0) {
      setVariantQtys({});
      setVariantProduct(product);
    } else {
      setBulkQty(1);
      setBulkProduct(product);
    }
  }

  function selectFromSuggest(product: POSProduct) {
    handleProductClick(product);
    setSearch("");
    setSearchFocused(false);
  }

  function confirmBulkAdd() {
    if (!bulkProduct) return;
    addItem(
      {
        productId: bulkProduct._id,
        name: bulkProduct.name,
        sku: bulkProduct.sku,
        price: bulkProduct.retailPrice,
        image: bulkProduct.images?.[0],
        maxStock: bulkProduct.stock,
      },
      bulkQty
    );
    setBulkProduct(null);
  }

  function addVariantToCart(product: POSProduct, variant: POSVariant) {
    if (variant.stock === 0) return;
    const qty = variantQtys[variant._id] ?? 1;
    addItem(
      {
        productId: product._id,
        variantId: variant._id,
        name: `${product.name} — ${variant.name}`,
        sku: variant.sku,
        price: variant.retailPrice,
        image: product.images?.[0],
        maxStock: variant.stock,
      },
      qty
    );
    setVariantProduct(null);
  }

  function setVariantQty(variantId: string, qty: number, maxStock: number) {
    setVariantQtys((prev) => ({
      ...prev,
      [variantId]: Math.max(1, Math.min(qty, maxStock)),
    }));
  }

  function getCartQty(productId: string, variantId?: string): number {
    return (
      items.find(
        (i) => i.productId === productId && (i.variantId ?? undefined) === variantId
      )?.quantity ?? 0
    );
  }

  function getTotalCartQtyForProduct(productId: string): number {
    return items
      .filter((i) => i.productId === productId)
      .reduce((s, i) => s + i.quantity, 0);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search + filter — z-index keeps suggest dropdown above the scrollable grid */}
      <div className="relative z-30 border-b space-y-3 bg-background p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products or scan barcode..."
            value={search}
            autoComplete="off"
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => {
              window.setTimeout(() => setSearchFocused(false), 180);
            }}
            className="pl-9"
          />
          {showSuggestDropdown && (
            <div
              className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md"
              role="listbox"
            >
              {posSearchLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching…
                </div>
              ) : isPosSearchError ? (
                <p className="px-3 py-3 text-sm text-destructive">
                  {posSearchError instanceof Error ? posSearchError.message : "Search failed. Try again."}
                </p>
              ) : searchHits.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">No products match this branch.</p>
              ) : (
                searchHits.map((p) => {
                  const hasVariants = p.variants.length > 0;
                  const totalStock = hasVariants
                    ? p.variants.reduce((s, v) => s + v.stock, 0)
                    : p.stock;
                  const out = totalStock === 0;
                  const price = p.retailPrice;
                  return (
                    <button
                      key={p._id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      disabled={out}
                      className="flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => !out && selectFromSuggest(p)}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.sku}
                        {" · "}
                        {hasVariants ? `${p.variants.length} variants` : `${p.stock} in stock`}
                        {" · "}
                        {hasVariants ? `from ${formatMoney(price)}` : formatMoney(price)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="w-full">
            {CATEGORY_FILTERS.map((c) => (
              <TabsTrigger key={c.value} value={c.value} className="flex-1 text-xs">
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Package className="h-12 w-12 mb-2 opacity-30" />
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((product) => {
              const hasVariants = product.variants.length > 0;
              const totalStock = hasVariants
                ? product.variants.reduce((s, v) => s + v.stock, 0)
                : product.stock;
              const outOfStock = totalStock === 0;
              const cartQty = getTotalCartQtyForProduct(product._id);
              const price = product.retailPrice;

              return (
                <button
                  key={product._id}
                  onClick={() => handleProductClick(product)}
                  disabled={outOfStock}
                  className={`relative flex flex-col p-3 rounded-xl border text-left transition-all ${
                    outOfStock
                      ? "opacity-50 cursor-not-allowed bg-muted"
                      : "hover:border-primary hover:shadow-md active:scale-95 bg-card"
                  }`}
                >
                  {cartQty > 0 && (
                    <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold z-10">
                      {cartQty}
                    </div>
                  )}
                  <div className="h-16 w-full rounded-lg bg-muted flex items-center justify-center mb-2">
                    {product.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover rounded-lg"
                      />
                    ) : (
                      <Package className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs font-medium line-clamp-2 leading-tight">{product.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{product.sku}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">
                      {hasVariants ? "from " : ""}{formatMoney(price)}
                    </span>
                    <Badge
                      variant={outOfStock ? "destructive" : totalStock <= 5 ? "warning" : "secondary"}
                      className="text-[10px] px-1 py-0"
                    >
                      {outOfStock ? "OUT" : hasVariants ? `${product.variants.length}v` : `${totalStock}`}
                    </Badge>
                  </div>
                  {!outOfStock && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <ShoppingCart className="h-3 w-3" />
                      {hasVariants ? "Select variant" : "Tap to add"}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk quantity dialog (base products) */}
      <Dialog open={!!bulkProduct} onOpenChange={(o) => !o && setBulkProduct(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">{bulkProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-xs text-muted-foreground">
              {bulkProduct?.sku} · {bulkProduct?.stock} in stock
            </p>
            <div className="flex items-center gap-3 justify-center">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setBulkQty((q) => Math.max(1, q - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                value={bulkQty}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 1;
                  setBulkQty(Math.max(1, Math.min(v, bulkProduct?.stock ?? 1)));
                }}
                className="h-9 w-16 text-center text-base px-1"
                min={1}
                max={bulkProduct?.stock}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setBulkQty((q) => Math.min(q + 1, bulkProduct?.stock ?? 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-center text-sm font-semibold text-primary">
              {bulkProduct && formatMoney(bulkProduct.retailPrice * bulkQty)}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkProduct(null)}>
              Cancel
            </Button>
            <Button onClick={confirmBulkAdd} className="flex-1">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add {bulkQty > 1 ? `×${bulkQty}` : "to Cart"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant selection dialog */}
      <Dialog open={!!variantProduct} onOpenChange={(o) => !o && setVariantProduct(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{variantProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {/* Base product (if it has its own stock) */}
            {variantProduct && variantProduct.stock > 0 && (
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Base</p>
                    <p className="text-xs text-muted-foreground">{variantProduct.sku} · {variantProduct.stock} in stock</p>
                  </div>
                  <p className="text-sm font-bold text-primary">
                    {formatMoney(variantProduct.retailPrice * (variantQtys["__base__"] ?? 1))}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7"
                      onClick={() => setVariantQty("__base__", (variantQtys["__base__"] ?? 1) - 1, variantProduct.stock)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input type="number" value={variantQtys["__base__"] ?? 1}
                      onChange={(e) => setVariantQty("__base__", parseInt(e.target.value) || 1, variantProduct.stock)}
                      className="h-7 w-12 text-center text-sm px-1" min={1} max={variantProduct.stock} />
                    <Button variant="outline" size="icon" className="h-7 w-7"
                      onClick={() => setVariantQty("__base__", (variantQtys["__base__"] ?? 1) + 1, variantProduct.stock)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button className="flex-1 h-7 text-xs"
                    onClick={() => {
                      const qty = variantQtys["__base__"] ?? 1;
                      addItem({ productId: variantProduct._id, name: variantProduct.name, sku: variantProduct.sku, price: variantProduct.retailPrice, image: variantProduct.images?.[0], maxStock: variantProduct.stock }, qty);
                      setVariantProduct(null);
                    }}>
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Add {(variantQtys["__base__"] ?? 1) > 1 ? `×${variantQtys["__base__"]}` : ""}
                  </Button>
                </div>
              </div>
            )}

            {variantProduct?.variants.map((v) => {
              const outOfStock = v.stock === 0;
              const cartQty = getCartQty(variantProduct._id, v._id);
              const qty = variantQtys[v._id] ?? 1;
              return (
                <div
                  key={v._id}
                  className={`rounded-lg border p-3 space-y-2 ${outOfStock ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{v.name}</p>
                        {cartQty > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            {cartQty} in cart
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1 flex-wrap mt-0.5">
                        {v.attributes.map((a, i) => (
                          <span key={i} className="text-xs text-muted-foreground">
                            {a.key}: {a.value}
                          </span>
                        ))}
                      </div>
                      <p className={`text-xs mt-0.5 ${outOfStock ? "text-destructive" : "text-muted-foreground"}`}>
                        {outOfStock ? "Out of stock" : `${v.stock} left`}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-primary">
                      {formatMoney(v.retailPrice * qty)}
                    </p>
                  </div>
                  {!outOfStock && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7"
                          onClick={() => setVariantQty(v._id, qty - 1, v.stock)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input type="number" value={qty}
                          onChange={(e) => setVariantQty(v._id, parseInt(e.target.value) || 1, v.stock)}
                          className="h-7 w-12 text-center text-sm px-1" min={1} max={v.stock} />
                        <Button variant="outline" size="icon" className="h-7 w-7"
                          onClick={() => setVariantQty(v._id, qty + 1, v.stock)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button className="flex-1 h-7 text-xs"
                        onClick={() => addVariantToCart(variantProduct, v)}>
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Add {qty > 1 ? `×${qty}` : ""}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="pt-2">
            <Button variant="outline" className="w-full" onClick={() => setVariantProduct(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
