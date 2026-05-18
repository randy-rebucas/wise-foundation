"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AccountPageHeader } from "@/components/marketplace/account/AccountPageHeader";
import { OrderThumbnail } from "@/components/marketplace/account/OrderThumbnail";
import { formatOrderDate, statusDisplay } from "@/components/marketplace/account/orderUtils";
import { Button } from "@/components/ui/button";
import { useFormatCurrency } from "@/components/providers/TenantProvider";
import { cn } from "@/lib/utils";
import type { CustomerOrderDetail } from "@/lib/services/customerAccountData.service";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash on Delivery",
  gcash: "GCash",
  card: "Credit / Debit Card",
  bank_transfer: "Bank Transfer",
  credit: "Store Credit",
};

export default function AccountOrderDetailPage() {
  const params = useParams();
  const orderId = String(params.id ?? "");
  const money = useFormatCurrency();
  const [order, setOrder] = useState<CustomerOrderDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Order not found");
        setOrder(null);
        return;
      }
      setOrder(json.data as CustomerOrderDetail);
    } catch {
      setError("Could not load order");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#6ea43f]" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <>
        <Button asChild variant="ghost" className="mb-4 rounded-xl">
          <Link href="/account/orders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to orders
          </Link>
        </Button>
        <p className="text-sm text-destructive">{error || "Order not found"}</p>
      </>
    );
  }

  const statusInfo = statusDisplay(order.status);

  return (
    <>
      <Button asChild variant="ghost" className="mb-4 -ml-2 rounded-xl text-[#2A4C6A]/75">
        <Link href="/account/orders">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to orders
        </Link>
      </Button>

      <AccountPageHeader
        title={order.orderNumber}
        description={`Placed ${formatOrderDate(order.createdAt)}`}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            statusInfo.className
          )}
        >
          {statusInfo.label}
        </span>
        <span className="text-sm text-[#2A4C6A]/65">
          Payment: {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
        </span>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="rounded-2xl border border-white/65 bg-white/60 p-5 shadow-sm">
          <h2 className="font-semibold text-[#1e3157]">Items</h2>
          <ul className="mt-4 space-y-4">
            {order.items.map((item) => (
              <li key={`${item.productId}-${item.sku}`} className="flex gap-3 border-b border-white/50 pb-4 last:border-0 last:pb-0">
                <OrderThumbnail url={item.thumbnailUrl} name={item.productName} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#1e3157]">{item.productName}</p>
                  {item.variantName ? (
                    <p className="text-xs text-[#2A4C6A]/65">{item.variantName}</p>
                  ) : null}
                  <p className="text-xs text-[#2A4C6A]/55">SKU: {item.sku}</p>
                  <p className="mt-1 text-sm text-[#2A4C6A]/75">
                    {item.quantity} × {money(item.unitPrice)}
                  </p>
                </div>
                <p className="font-semibold text-[#1e3157]">{money(item.total)}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-5">
          {order.shipping ? (
            <section className="rounded-2xl border border-white/65 bg-white/60 p-5 shadow-sm">
              <h2 className="font-semibold text-[#1e3157]">Shipping</h2>
              <p className="mt-3 text-sm text-[#2A4C6A]/80">{order.shipping.fullName}</p>
              <p className="text-sm text-[#2A4C6A]/70">{order.shipping.phone}</p>
              <p className="text-sm text-[#2A4C6A]/70">{order.shipping.email}</p>
              <p className="mt-2 text-sm text-[#2A4C6A]/75">
                {order.shipping.line1}
                {order.shipping.line2 ? `, ${order.shipping.line2}` : ""}
                <br />
                {order.shipping.city}, {order.shipping.region} {order.shipping.postalCode}
              </p>
            </section>
          ) : null}

          <section className="rounded-2xl border border-white/65 bg-white/60 p-5 shadow-sm">
            <h2 className="font-semibold text-[#1e3157]">Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#2A4C6A]/65">Subtotal</dt>
                <dd className="font-semibold">{money(order.subtotal)}</dd>
              </div>
              {order.discountAmount > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-[#2A4C6A]/65">Discount</dt>
                  <dd className="font-semibold text-emerald-600">−{money(order.discountAmount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-white/50 pt-2 text-base">
                <dt className="font-semibold text-[#1e3157]">Total</dt>
                <dd className="font-bold text-[#1e3157]">{money(order.total)}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </>
  );
}
