"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface MarketplaceCartLine {
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  variantName?: string;
  sku: string;
  price: number;
  image?: string;
  quantity: number;
  maxStock: number;
}

interface MarketplaceCartState {
  items: MarketplaceCartLine[];
  addItem: (item: Omit<MarketplaceCartLine, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  updateQty: (productId: string, variantId: string | null, quantity: number) => void;
  clear: () => void;
  getSubtotal: () => number;
  getCount: () => number;
}

export const useMarketplaceCartStore = create<MarketplaceCartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const qty = item.quantity ?? 1;
        set((s) => {
          const idx = s.items.findIndex(
            (i) => i.productId === item.productId && i.variantId === item.variantId
          );
          if (idx >= 0) {
            const next = [...s.items];
            const cur = next[idx]!;
            const nq = Math.min(cur.quantity + qty, cur.maxStock);
            next[idx] = { ...cur, quantity: nq };
            return { items: next };
          }
          return {
            items: [
              ...s.items,
              { ...item, quantity: Math.min(Math.max(1, qty), item.maxStock) },
            ],
          };
        });
      },
      removeItem: (productId, variantId) =>
        set((s) => ({
          items: s.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId)
          ),
        })),
      updateQty: (productId, variantId, quantity) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.productId === productId && i.variantId === variantId
              ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxStock)) }
              : i
          ),
        })),
      clear: () => set({ items: [] }),
      getSubtotal: () => get().items.reduce((a, i) => a + i.price * i.quantity, 0),
      getCount: () => get().items.reduce((a, i) => a + i.quantity, 0),
    }),
    { name: "glowish-marketplace-cart" }
  )
);
