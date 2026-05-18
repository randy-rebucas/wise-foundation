"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface MarketplaceSavedAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  isDefault: boolean;
}

interface MarketplaceAddressesState {
  items: MarketplaceSavedAddress[];
  addAddress: (address: Omit<MarketplaceSavedAddress, "id">) => void;
  updateAddress: (id: string, patch: Partial<Omit<MarketplaceSavedAddress, "id">>) => void;
  removeAddress: (id: string) => void;
  setDefault: (id: string) => void;
}

function newId() {
  return `addr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useMarketplaceAddressesStore = create<MarketplaceAddressesState>()(
  persist(
    (set) => ({
      items: [],
      addAddress: (address) =>
        set((s) => {
          const id = newId();
          const isDefault = address.isDefault || s.items.length === 0;
          const items = isDefault
            ? s.items.map((a) => ({ ...a, isDefault: false }))
            : s.items;
          return {
            items: [...items, { ...address, id, isDefault }],
          };
        }),
      updateAddress: (id, patch) =>
        set((s) => ({
          items: s.items.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
      removeAddress: (id) =>
        set((s) => {
          const next = s.items.filter((a) => a.id !== id);
          if (next.length > 0 && !next.some((a) => a.isDefault)) {
            next[0] = { ...next[0]!, isDefault: true };
          }
          return { items: next };
        }),
      setDefault: (id) =>
        set((s) => ({
          items: s.items.map((a) => ({ ...a, isDefault: a.id === id })),
        })),
    }),
    { name: "glowish-marketplace-addresses" }
  )
);
