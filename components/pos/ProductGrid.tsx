"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Package, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency } from "@/lib/utils";
import type { ProductCategory } from "@/types";

interface POSVariant {
  _id: string;
  name: string;
  sku: string;
  attributes: { key: string; value: string }[];
  retailPrice: number;
  memberPrice: number;
  stock: number;
}

interface POSProduct {
  _id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  retailPrice: number;
  memberPrice: number;
  images: string[];
  stock: number;
  variants: POSVariant[];
}

interface ProductGridProps {
  products: POSProduct[];
  isMember: boolean;
}

const CATEGORY_FILTERS = [
  { value: "all", label: "All" },
  { value: "homecare", label: "Home Care" },
  { value: "cosmetics", label: "Cosmetics" },
  { value: "wellness", label: "Wellness" },
  { value: "scent", label: "Scents" },
];

export function ProductGrid({ products, isMember }: ProductGridProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [variantProduct, setVariantProduct] = useState<POSProduct | null>(null);
  const { addItem, items } = useCartStore();

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
      setVariantProduct(product);
    } else {
      addBaseToCart(product);
    }
  }

  function addBaseToCart(product: POSProduct) {
    if (product.stock === 0) return;
    addItem({
      productId: product._id,
      name: product.name,
      sku: product.sku,
      price: isMember ? product.memberPrice : product.retailPrice,
      image: product.images?.[0],
      maxStock: product.stock,
    });
  }

  function addVariantToCart(product: POSProduct, variant: POSVariant) {
    if (variant.stock === 0) return;
    addItem({
      productId: product._id,
      variantId: variant._id,
      name: `${product.name} — ${variant.name}`,
      sku: variant.sku,
      price: isMember ? variant.memberPrice : variant.retailPrice,
      image: product.images?.[0],
      maxStock: variant.stock,
    });
    setVariantProduct(null);
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
      {/* Search + filter */}
      <div className="p-4 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products or scan barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
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
              const price = isMember ? product.memberPrice : product.retailPrice;

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
                      {hasVariants ? "from " : ""}{formatCurrency(price)}
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

      {/* Variant selection dialog */}
      <Dialog open={!!variantProduct} onOpenChange={(o) => !o && setVariantProduct(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{variantProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {/* Base product (if it has its own stock) */}
            {variantProduct && variantProduct.stock > 0 && (
              <button
                onClick={() => { addBaseToCart(variantProduct); setVariantProduct(null); }}
                className="w-full flex items-center justify-between rounded-lg border p-3 hover:border-primary hover:bg-muted/50 transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium">Base</p>
                  <p className="text-xs text-muted-foreground">{variantProduct.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">
                    {formatCurrency(isMember ? variantProduct.memberPrice : variantProduct.retailPrice)}
                  </p>
                  <p className="text-xs text-muted-foreground">{variantProduct.stock} in stock</p>
                </div>
              </button>
            )}

            {variantProduct?.variants.map((v) => {
              const outOfStock = v.stock === 0;
              const cartQty = getCartQty(variantProduct._id, v._id);
              return (
                <button
                  key={v._id}
                  onClick={() => !outOfStock && addVariantToCart(variantProduct, v)}
                  disabled={outOfStock}
                  className={`w-full flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                    outOfStock
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:border-primary hover:bg-muted/50"
                  }`}
                >
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
                    <p className="text-xs text-muted-foreground">{v.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">
                      {formatCurrency(isMember ? v.memberPrice : v.retailPrice)}
                    </p>
                    <p className={`text-xs ${outOfStock ? "text-destructive" : "text-muted-foreground"}`}>
                      {outOfStock ? "Out of stock" : `${v.stock} left`}
                    </p>
                  </div>
                </button>
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
