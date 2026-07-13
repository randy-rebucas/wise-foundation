import { create } from "zustand";
import { persist } from "zustand/middleware";

type SpinWheelState = {
  hasSpun: boolean;
  wonCouponCode: string | null;
  wonPrizeLabel: string | null;
  isOpen: boolean;
  markSpun: (code: string, prizeLabel?: string) => void;
  openWheel: () => void;
  closeWheel: () => void;
  reset: () => void;
};

export const useSpinWheelStore = create<SpinWheelState>()(
  persist(
    (set) => ({
      hasSpun: false,
      wonCouponCode: null,
      wonPrizeLabel: null,
      isOpen: false,
      markSpun: (code, prizeLabel) =>
        set({ hasSpun: true, wonCouponCode: code, wonPrizeLabel: prizeLabel ?? null }),
      openWheel: () => set({ isOpen: true }),
      closeWheel: () => set({ isOpen: false }),
      reset: () => set({ hasSpun: false, wonCouponCode: null, wonPrizeLabel: null }),
    }),
    {
      name: "glowish-spin-wheel",
      partialize: (state) => ({
        hasSpun: state.hasSpun,
        wonCouponCode: state.wonCouponCode,
        wonPrizeLabel: state.wonPrizeLabel,
      }),
    }
  )
);
