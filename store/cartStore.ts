import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartState, CartItem } from "@/types";

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      memberId: null,
      memberName: null,
      discountPercent: 0,
      branchId: "",

      addItem: (newItem) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === newItem.productId && i.variantId === newItem.variantId
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === newItem.productId && i.variantId === newItem.variantId
                  ? { ...i, quantity: Math.min(i.quantity + 1, i.maxStock) }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...newItem, quantity: 1 }] };
        });
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId)
          ),
        }));
      },

      updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId && i.variantId === variantId
              ? { ...i, quantity: Math.min(quantity, i.maxStock) }
              : i
          ),
        }));
      },

      setMember: (memberId, memberName, discount) => {
        set({ memberId, memberName, discountPercent: discount });
      },

      clearCart: () => {
        set({ items: [], memberId: null, memberName: null, discountPercent: 0 });
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getDiscount: () => {
        const subtotal = get().getSubtotal();
        return (subtotal * get().discountPercent) / 100;
      },

      getTotal: () => {
        return get().getSubtotal() - get().getDiscount();
      },
    }),
    {
      name: "pos-cart",
      partialize: (state) => ({
        items: state.items,
        memberId: state.memberId,
        memberName: state.memberName,
        discountPercent: state.discountPercent,
        branchId: state.branchId,
      }),
    }
  )
);
