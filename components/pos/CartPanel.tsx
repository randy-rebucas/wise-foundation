"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  User,
  X,
  CreditCard,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CartPanelProps {
  onCheckout: () => void;
  onMemberSearch: () => void;
}

export function CartPanel({ onCheckout, onMemberSearch }: CartPanelProps) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const {
    items,
    memberId,
    memberName,
    discountPercent,
    removeItem,
    updateQuantity,
    clearCart,
    setMember,
    getSubtotal,
    getDiscount,
    getTotal,
  } = useCartStore();

  const subtotal = hydrated ? getSubtotal() : 0;
  const discount = hydrated ? getDiscount() : 0;
  const total = hydrated ? getTotal() : 0;
  const hydratedItems = hydrated ? items : [];
  const hydratedMemberId = hydrated ? memberId : null;
  const hydratedMemberName = hydrated ? memberName : null;
  const hydratedDiscountPercent = hydrated ? discountPercent : 0;

  return (
    <div className="flex flex-col h-full border-l bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <span className="font-semibold">Cart</span>
          {hydratedItems.length > 0 && (
            <Badge variant="secondary">{hydratedItems.length}</Badge>
          )}
        </div>
        {hydratedItems.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearCart} className="text-muted-foreground">
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Member Section */}
      <div className="p-3 border-b bg-muted/30">
        {hydratedMemberId ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">{hydratedMemberName}</p>
                <p className="text-xs text-muted-foreground">{hydratedDiscountPercent}% member discount</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setMember(null, null, 0)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full" onClick={onMemberSearch}>
            <User className="h-4 w-4 mr-2" />
            Apply Member Discount
          </Button>
        )}
      </div>

      {/* Cart Items */}
      <ScrollArea className="flex-1">
        {hydratedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <ShoppingCart className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Cart is empty</p>
            <p className="text-xs">Add products to get started</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {hydratedItems.map((item) => (
              <div
                key={`${item.productId}-${item.variantId}`}
                className="flex gap-3 p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                  <p className="text-sm font-semibold text-primary mt-1">
                    {formatCurrency(item.price)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item.productId, item.variantId)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateQuantity(item.productId, parseInt(e.target.value) || 1, item.variantId)
                      }
                      className="h-7 w-12 text-center text-sm px-1"
                      min={1}
                      max={item.maxStock}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                      disabled={item.quantity >= item.maxStock}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs font-medium">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Totals */}
      <div className="p-4 border-t space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount ({discountPercent}%)</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={onCheckout}
          disabled={hydratedItems.length === 0}
        >
          <CreditCard className="h-5 w-5 mr-2" />
          Checkout {hydratedItems.length > 0 && `(${hydratedItems.length})`}
        </Button>
      </div>
    </div>
  );
}
