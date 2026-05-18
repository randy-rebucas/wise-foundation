"use client";

import { useCallback, useEffect, useState } from "react";
import { AccountPageHeader } from "@/components/marketplace/account/AccountPageHeader";
import { OrdersList } from "@/components/marketplace/account/OrdersList";
import type { CustomerOrderRow } from "@/lib/services/customerOrders.service";

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<CustomerOrderRow[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/account/orders");
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Could not load orders");
        setOrders([]);
        return;
      }
      setOrders(json.data as CustomerOrderRow[]);
    } catch {
      setError("Could not load orders");
      setOrders([]);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  return (
    <>
      <AccountPageHeader
        title="My Orders"
        description="Track shipments, view receipts, and reorder your favorites."
      />
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6">
        <OrdersList orders={orders} loading={orders === null} />
      </div>
    </>
  );
}
