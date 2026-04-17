"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Package, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency } from "@/lib/utils";
import type { ProductCategory } from "@/types";

interface POSProduct {
  _id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  retailPrice: number;
  memberPrice: number;
  images: string[];
  stock: number;
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
  const { addItem, items } = useCartStore();

  const filtered = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || p.category === category;
    return matchesSearch && matchesCategory;
  });

  function handleAddToCart(product: POSProduct) {
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

  function getCartQty(productId: string): number {
    return items.find((i) => i.productId === productId && !i.variantId)?.quantity ?? 0;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
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

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Package className="h-12 w-12 mb-2 opacity-30" />
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((product) => {
              const cartQty = getCartQty(product._id);
              const outOfStock = product.stock === 0;
              const price = isMember ? product.memberPrice : product.retailPrice;

              return (
                <button
                  key={product._id}
                  onClick={() => handleAddToCart(product)}
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
                    <span className="text-sm font-bold text-primary">{formatCurrency(price)}</span>
                    <Badge
                      variant={outOfStock ? "destructive" : product.stock <= 5 ? "warning" : "secondary"}
                      className="text-[10px] px-1 py-0"
                    >
                      {outOfStock ? "OUT" : `${product.stock}`}
                    </Badge>
                  </div>
                  {!outOfStock && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <ShoppingCart className="h-3 w-3" />
                      Tap to add
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
