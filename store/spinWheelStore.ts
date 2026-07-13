import { create } from "zustand";
import { persist } from "zustand/middleware";

type SpinWheelState = {
  hasSpun: boolean;
  wonCouponCode: string | null;
  markSpun: (code: string) => void;
  reset: () => void;
};

export const useSpinWheelStore = create<SpinWheelState>()(
  persist(
    (set) => ({
      hasSpun: false,
      wonCouponCode: null,
      markSpun: (code) => set({ hasSpun: true, wonCouponCode: code }),
      reset: () => set({ hasSpun: false, wonCouponCode: null }),
    }),
    { name: "glowish-spin-wheel" }
  )
);
