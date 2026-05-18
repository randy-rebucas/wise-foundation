"use client";

import { useCallback, useEffect, useState } from "react";
import type { MarketplaceWishlistItem } from "@/lib/types/customerAccount";

export function useAccountWishlist() {
  const [items, setItems] = useState<MarketplaceWishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/account/wishlist");
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Could not load wishlist");
        setItems([]);
        return;
      }
      setItems(json.data as MarketplaceWishlistItem[]);
    } catch {
      setError("Could not load wishlist");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const addItem = useCallback(
    async (item: Omit<MarketplaceWishlistItem, "addedAt">) => {
      const res = await fetch("/api/account/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Could not save");
      setItems(json.data as MarketplaceWishlistItem[]);
    },
    []
  );

  const removeItem = useCallback(async (productId: string, variantId: string | null) => {
    const params = new URLSearchParams({ productId });
    if (variantId) params.set("variantId", variantId);
    else params.set("variantId", "null");
    const res = await fetch(`/api/account/wishlist?${params}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? "Could not remove");
    setItems(json.data as MarketplaceWishlistItem[]);
  }, []);

  const hasItem = useCallback(
    (productId: string, variantId: string | null) =>
      items.some((i) => i.productId === productId && i.variantId === variantId),
    [items]
  );

  return { items, loading, error, load, addItem, removeItem, hasItem };
}
