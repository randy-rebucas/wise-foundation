"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface MarketplaceWishlistItem {
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  variantName?: string;
  sku: string;
  price: number;
  image?: string;
  addedAt: string;
}

interface MarketplaceWishlistState {
  items: MarketplaceWishlistItem[];
  addItem: (item: Omit<MarketplaceWishlistItem, "addedAt">) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  hasItem: (productId: string, variantId: string | null) => boolean;
  getCount: () => number;
}

export const useMarketplaceWishlistStore = create<MarketplaceWishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((s) => {
          if (
            s.items.some(
              (i) => i.productId === item.productId && i.variantId === item.variantId
            )
          ) {
            return s;
          }
          return {
            items: [...s.items, { ...item, addedAt: new Date().toISOString() }],
          };
        }),
      removeItem: (productId, variantId) =>
        set((s) => ({
          items: s.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId)
          ),
        })),
      hasItem: (productId, variantId) =>
        get().items.some(
          (i) => i.productId === productId && i.variantId === variantId
        ),
      getCount: () => get().items.length,
    }),
    { name: "glowish-marketplace-wishlist" }
  )
);
