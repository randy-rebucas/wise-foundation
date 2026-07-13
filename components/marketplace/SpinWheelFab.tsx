"use client";

import { useSpinWheelStore } from "@/store/spinWheelStore";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";

export function SpinWheelFab() {
  const isOpen = useSpinWheelStore((s) => s.isOpen);
  const hasSpun = useSpinWheelStore((s) => s.hasSpun);
  const openWheel = useSpinWheelStore((s) => s.openWheel);

  return (
    <button
      type="button"
      onClick={openWheel}
      aria-label={hasSpun ? "View your spin wheel prize" : "Spin the wheel to win a prize"}
      title={hasSpun ? "View your prize" : "Spin & Win"}
      className={cn(
        "fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full",
        "bg-gradient-to-br from-[#6ea43f] to-[#d965c9] text-white shadow-[0_10px_30px_rgba(94,70,135,0.35)]",
        "transition-transform hover:scale-105 active:scale-95",
        "animate-[spin-fab-bounce_2.4s_ease-in-out_infinite]",
        isOpen && "pointer-events-none opacity-0"
      )}
    >
      <Gift className="h-6 w-6" aria-hidden />
      {!hasSpun && (
        <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#d965c9]" />
      )}
      <style jsx>{`
        @keyframes spin-fab-bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </button>
  );
}
