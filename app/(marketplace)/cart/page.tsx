"use client";

import Link from "next/link";
import Image from "next/image";
import { Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFormatCurrency } from "@/components/providers/TenantProvider";
import { useMarketplaceCartStore } from "@/store/marketplaceCartStore";

export default function MarketplaceCartPage() {
  const money = useFormatCurrency();
  const items = useMarketplaceCartStore((s) => s.items);
  const updateQty = useMarketplaceCartStore((s) => s.updateQty);
  const removeItem = useMarketplaceCartStore((s) => s.removeItem);
  const getSubtotal = useMarketplaceCartStore((s) => s.getSubtotal);
  const subtotal = getSubtotal();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Your cart</h1>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Button asChild>
              <Link href="/">Continue shopping</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            {items.map((line) => (
              <Card key={`${line.productId}-${line.variantId ?? ""}`}>
                <CardContent className="flex gap-4 p-4">
                  <div className="h-20 w-20 shrink-0 rounded-md bg-muted overflow-hidden relative">
                    {line.image && /^https?:\/\//i.test(line.image) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={line.image} alt="" className="h-full w-full object-cover" />
                    ) : line.image ? (
                      <Image src={line.image} alt="" fill className="object-cover" sizes="80px" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <Link
                      href={`/product/${encodeURIComponent(line.slug)}`}
                      className="font-semibold hover:underline line-clamp-2"
                    >
                      {line.name}
                    </Link>
                    {line.variantName && (
                      <p className="text-xs text-muted-foreground">{line.variantName}</p>
                    )}
                    <p className="text-xs text-muted-foreground font-mono">{line.sku}</p>
                    <p className="font-medium">{money(line.price)} each</p>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateQty(line.productId, line.variantId, line.quantity - 1)
                        }
                      >
                        −
                      </Button>
                      <span className="w-8 text-center text-sm">{line.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateQty(line.productId, line.variantId, line.quantity + 1)
                        }
                      >
                        +
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive ml-auto"
                        onClick={() => removeItem(line.productId, line.variantId)}
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-right font-semibold shrink-0">
                    {money(line.price * line.quantity)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="h-fit lg:sticky lg:top-20">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{money(subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Shipping calculated at checkout. Taxes may apply.
              </p>
              <Button className="w-full gap-2" size="lg" asChild>
                <Link href="/checkout">
                  Checkout
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Keep shopping
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
