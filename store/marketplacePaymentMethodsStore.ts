"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PaymentMethodType = "card" | "gcash" | "bank_transfer";

export interface MarketplacePaymentMethod {
  id: string;
  type: PaymentMethodType;
  label: string;
  last4?: string;
  isDefault: boolean;
}

interface MarketplacePaymentMethodsState {
  items: MarketplacePaymentMethod[];
  addMethod: (method: Omit<MarketplacePaymentMethod, "id">) => void;
  removeMethod: (id: string) => void;
  setDefault: (id: string) => void;
}

function newId() {
  return `pay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useMarketplacePaymentMethodsStore = create<MarketplacePaymentMethodsState>()(
  persist(
    (set) => ({
      items: [],
      addMethod: (method) =>
        set((s) => {
          const id = newId();
          const isDefault = method.isDefault || s.items.length === 0;
          const items = isDefault
            ? s.items.map((m) => ({ ...m, isDefault: false }))
            : s.items;
          return {
            items: [...items, { ...method, id, isDefault }],
          };
        }),
      removeMethod: (id) =>
        set((s) => {
          const next = s.items.filter((m) => m.id !== id);
          if (next.length > 0 && !next.some((m) => m.isDefault)) {
            next[0] = { ...next[0]!, isDefault: true };
          }
          return { items: next };
        }),
      setDefault: (id) =>
        set((s) => ({
          items: s.items.map((m) => ({ ...m, isDefault: m.id === id })),
        })),
    }),
    { name: "glowish-marketplace-payment-methods" }
  )
);
