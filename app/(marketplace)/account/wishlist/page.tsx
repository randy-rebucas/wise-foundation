"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Loader2, ShoppingCart, Trash2 } from "lucide-react";
import { AccountPageHeader } from "@/components/marketplace/account/AccountPageHeader";
import { useAccountWishlist } from "@/components/marketplace/account/useAccountWishlist";
import { Button } from "@/components/ui/button";
import { useFormatCurrency } from "@/components/providers/TenantProvider";
import { useMarketplaceCartStore } from "@/store/marketplaceCartStore";
import { useToast } from "@/hooks/use-toast";

function isRemote(url: string) {
  return /^https?:\/\//i.test(url);
}

export default function AccountWishlistPage() {
  const money = useFormatCurrency();
  const { toast } = useToast();
  const { items, loading, error, removeItem } = useAccountWishlist();
  const addToCart = useMarketplaceCartStore((s) => s.addItem);

  async function handleRemove(productId: string, variantId: string | null) {
    try {
      await removeItem(productId, variantId);
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Could not remove item",
        variant: "destructive",
      });
    }
  }

  return (
    <>
      <AccountPageHeader
        title="My Wishlist"
        description="Products you've saved for later."
      />

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#6ea43f]" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-[10px] border border-white/65 bg-white/60 p-10 text-center shadow-sm">
          <Heart className="mx-auto h-10 w-10 text-pink-400" />
          <p className="mt-4 text-sm text-[#2A4C6A]/75">Your wishlist is empty.</p>
          <Button asChild className="mt-4 rounded-[10px] bg-[#6ea43f] text-white hover:bg-[#5d9235]">
            <Link href="/shop">Browse products</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((item) => (
            <li
              key={`${item.productId}-${item.variantId ?? "base"}`}
              className="flex flex-col gap-4 rounded-[10px] border border-white/65 bg-white/60 p-4 shadow-sm sm:flex-row sm:items-center"
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[10px] bg-violet-50">
                {item.image ? (
                  isRemote(item.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-violet-300">
                    <Heart className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/product/${item.slug}`}
                  className="font-semibold text-[#1e3157] hover:text-[#6ea43f]"
                >
                  {item.name}
                </Link>
                {item.variantName ? (
                  <p className="text-xs text-[#2A4C6A]/65">{item.variantName}</p>
                ) : null}
                <p className="mt-1 font-bold text-[#1e3157]">{money(item.price)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-[10px] bg-[#6ea43f] text-white hover:bg-[#5d9235]"
                  onClick={() =>
                    addToCart({
                      productId: item.productId,
                      variantId: item.variantId,
                      slug: item.slug,
                      name: item.name,
                      variantName: item.variantName,
                      sku: item.sku,
                      price: item.price,
                      image: item.image,
                      maxStock: 99,
                      quantity: 1,
                    })
                  }
                >
                  <ShoppingCart className="mr-1.5 h-4 w-4" />
                  Add to cart
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-[10px] border-white/70 bg-white/65"
                  onClick={() => void handleRemove(item.productId, item.variantId)}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
