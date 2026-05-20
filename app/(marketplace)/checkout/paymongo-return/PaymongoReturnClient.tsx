"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PAYMONGO_CHECKOUT_STORAGE_KEY,
  type PaymongoPendingCheckout,
} from "@/lib/constants/paymongoCheckout";
import { useMarketplaceCartStore } from "@/store/marketplaceCartStore";
import { useToast } from "@/hooks/use-toast";

export function PaymongoReturnClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const clear = useMarketplaceCartStore((s) => s.clear);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const intentFromUrl = searchParams.get("payment_intent_id");

    void (async () => {
      try {
        const raw = sessionStorage.getItem(PAYMONGO_CHECKOUT_STORAGE_KEY);
        if (!raw) {
          setError("Checkout session expired. Return to checkout and try again.");
          return;
        }

        const pending = JSON.parse(raw) as PaymongoPendingCheckout;
        const paymentIntentId = intentFromUrl ?? pending.paymentIntentId;
        if (!paymentIntentId) {
          setError("Missing payment confirmation. Try checkout again.");
          return;
        }

        const res = await fetch("/api/marketplace/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: pending.items,
            shipping: pending.shipping,
            shippingMethod: pending.shippingMethod,
            paymentMethod: pending.paymentMethod,
            paymongoPaymentIntentId: paymentIntentId,
            notes: pending.notes,
            saveAddress: pending.saveAddress,
          }),
        });
        const json = await res.json();
        sessionStorage.removeItem(PAYMONGO_CHECKOUT_STORAGE_KEY);

        if (!json.success) {
          throw new Error(json.error ?? "Could not place order");
        }

        const { orderNumber, total: orderTotal } = json.data as {
          orderNumber: string;
          total: number;
        };
        clear();
        const successParams = new URLSearchParams({
          orderNumber,
          total: String(orderTotal),
        });
        router.replace(`/checkout/success?${successParams.toString()}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Payment confirmation failed";
        setError(msg);
        toast({ title: "Order not placed", description: msg, variant: "destructive" });
      }
    })();
  }, [searchParams, router, clear, toast]);

  if (error) {
    return (
      <div className="-mx-4 -my-8 min-h-full px-4 py-16 font-[family-name:var(--font-plus-jakarta-sans)] text-[#2A4C6A]">
        <div className="mx-auto max-w-lg rounded-[2rem] border border-white/65 bg-white/55 p-10 text-center shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl">
          <Package className="mx-auto mb-4 h-12 w-12 text-destructive/70" />
          <h1 className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157]">
            Payment issue
          </h1>
          <p className="mt-3 text-sm text-[#2A4C6A]/75">{error}</p>
          <Button className="mt-6 rounded-xl" asChild>
            <Link href="/checkout">Back to checkout</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-4 -my-8 flex min-h-[50vh] items-center justify-center px-4 py-16 font-[family-name:var(--font-plus-jakarta-sans)] text-[#2A4C6A]">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#6ea43f]" />
        <p className="text-sm font-medium text-[#1e3157]">Confirming your payment…</p>
      </div>
    </div>
  );
}
