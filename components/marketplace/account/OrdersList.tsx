"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormatCurrency } from "@/components/providers/TenantProvider";
import { OrderThumbnail } from "@/components/marketplace/account/OrderThumbnail";
import { formatOrderDate, statusDisplay } from "@/components/marketplace/account/orderUtils";
import { cn } from "@/lib/utils";
import type { CustomerOrderRow } from "@/lib/services/customerOrders.service";

export function OrdersList({
  orders,
  loading,
  emptyMessage = "No orders yet.",
}: {
  orders: CustomerOrderRow[] | null;
  loading?: boolean;
  emptyMessage?: string;
}) {
  const money = useFormatCurrency();

  if (loading || orders === null) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#6ea43f]" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[#2A4C6A]/70">
        {emptyMessage}{" "}
        <Link href="/shop" className="font-semibold text-[#6ea43f] hover:underline">
          Start shopping
        </Link>
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {orders.map((order) => {
        const statusInfo = statusDisplay(order.status);
        return (
          <li
            key={order._id}
            className="flex flex-col gap-3 rounded-2xl border border-white/65 bg-white/60 p-4 shadow-sm sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <OrderThumbnail url={order.thumbnailUrl} name={order.orderNumber} />
              <div className="min-w-0">
                <p className="font-semibold text-[#1e3157]">{order.orderNumber}</p>
                <p className="text-xs text-[#2A4C6A]/65">
                  {formatOrderDate(order.createdAt)}
                  {order.itemCount > 0
                    ? ` · ${order.itemCount} item${order.itemCount === 1 ? "" : "s"}`
                    : ""}
                </p>
                {order.shipSummary !== "—" ? (
                  <p className="mt-0.5 truncate text-xs text-[#2A4C6A]/55">{order.shipSummary}</p>
                ) : null}
                <span
                  className={cn(
                    "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    statusInfo.className
                  )}
                >
                  {statusInfo.label}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:flex-col sm:items-end">
              <p className="font-bold text-[#1e3157]">{money(order.total)}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl border-white/70 bg-white/65 text-xs"
              >
                View Details
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
