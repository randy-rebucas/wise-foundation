"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSpinWheelStore } from "@/store/spinWheelStore";
import { SPIN_PRIZES, type SpinPrizeId } from "@/lib/constants/spinWheel";
import { Gift, Sparkles } from "lucide-react";

const SEGMENT_COLORS: Record<SpinPrizeId, string> = {
  percent_5: "#6ea43f",
  percent_10: "#d965c9",
  free_shipping: "#1e3157",
  free_perfume: "#f5a623",
};

const SEGMENT_COUNT = SPIN_PRIZES.length;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;
const DISMISS_SESSION_KEY = "glowish-spin-wheel-dismissed";
const POPUP_DELAY_MS = 6000;

function centerAngleForIndex(index: number) {
  return index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
}

function conicGradient() {
  const stops = SPIN_PRIZES.map((prize, i) => {
    const from = i * SEGMENT_ANGLE;
    const to = from + SEGMENT_ANGLE;
    return `${SEGMENT_COLORS[prize.id]} ${from}deg ${to}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

type SpinResponse = {
  alreadySpun: boolean;
  prizeId?: SpinPrizeId;
  prizeLabel?: string;
  couponCode?: string;
};

export function SpinWheelPopup() {
  const hasSpun = useSpinWheelStore((s) => s.hasSpun);
  const wonCouponCode = useSpinWheelStore((s) => s.wonCouponCode);
  const wonPrizeLabel = useSpinWheelStore((s) => s.wonPrizeLabel);
  const markSpun = useSpinWheelStore((s) => s.markSpun);
  const open = useSpinWheelStore((s) => s.isOpen);
  const openWheel = useSpinWheelStore((s) => s.openWheel);
  const closeWheel = useSpinWheelStore((s) => s.closeWheel);

  const [email, setEmail] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinResponse | null>(null);
  const [error, setError] = useState("");
  const spinsRef = useRef(0);

  useEffect(() => {
    if (hasSpun) return;
    if (typeof window !== "undefined" && sessionStorage.getItem(DISMISS_SESSION_KEY)) return;

    const timer = setTimeout(() => openWheel(), POPUP_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSpun]);

  // Reopening (e.g. via the floating button) after already winning shows the existing prize
  // instead of the entry form — the API would just reject a second spin anyway.
  useEffect(() => {
    if (open && hasSpun && wonCouponCode && !result) {
      setResult({ alreadySpun: false, couponCode: wonCouponCode, prizeLabel: wonPrizeLabel ?? undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleOpenChange(next: boolean) {
    if (!next && !result) {
      sessionStorage.setItem(DISMISS_SESSION_KEY, "1");
    }
    if (!next) setResult(null);
    if (next) openWheel();
    else closeWheel();
  }

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function handleSpin() {
    if (!emailValid || spinning) return;
    setSpinning(true);
    setError("");
    try {
      const res = await fetch("/api/marketplace/spin-wheel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Could not spin right now");
      const data = json.data as SpinResponse;

      if (data.alreadySpun) {
        setResult(data);
        setSpinning(false);
        return;
      }

      const index = SPIN_PRIZES.findIndex((p) => p.id === data.prizeId);
      const safeIndex = index === -1 ? 0 : index;
      const jitter = (Math.random() - 0.5) * (SEGMENT_ANGLE * 0.5);
      spinsRef.current += 1;
      const fullSpins = 5 + spinsRef.current;
      const target = fullSpins * 360 + (360 - centerAngleForIndex(safeIndex)) + jitter;
      setRotation(target);

      window.setTimeout(() => {
        setResult(data);
        setSpinning(false);
        if (data.couponCode) markSpun(data.couponCode, data.prizeLabel);
      }, 4200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not spin right now");
      setSpinning(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-b from-white via-[#fdf6ff] to-white p-6 text-center [&>button]:z-20">
        <DialogTitle className="sr-only">Spin the wheel</DialogTitle>

        {!result && (
          <>
            <p className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157]">
              Spin &amp; Win
            </p>
            <p className="mt-1 text-sm text-[#2A4C6A]/75">
              Enter your email for a chance at a discount or a free gift.
            </p>

            <div className="relative mx-auto mt-5 h-56 w-56">
              <div
                className="pointer-events-none absolute inset-0 rounded-full border-4 border-white shadow-[0_10px_35px_rgba(94,70,135,0.25)] transition-transform ease-out"
                style={{
                  background: conicGradient(),
                  transform: `rotate(${rotation}deg)`,
                  transitionDuration: spinning ? "4.2s" : "0s",
                }}
              >
                {SPIN_PRIZES.map((prize, i) => {
                  const angle = centerAngleForIndex(i);
                  return (
                    <span
                      key={prize.id}
                      className="absolute left-1/2 top-1/2 w-20 origin-left text-center text-[10px] font-bold text-white"
                      style={{
                        transform: `rotate(${angle}deg) translateX(0.5rem)`,
                      }}
                    >
                      {prize.label}
                    </span>
                  );
                })}
              </div>
              <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#6ea43f] bg-white shadow" />
              <div className="absolute left-1/2 top-[-6px] -translate-x-1/2 text-2xl leading-none text-[#d965c9]">
                ▼
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={spinning}
                className="text-center"
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <Button
                className="w-full rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white"
                disabled={!emailValid || spinning}
                onClick={handleSpin}
              >
                {spinning ? "Spinning…" : "Spin the wheel"}
              </Button>
            </div>
          </>
        )}

        {result && result.alreadySpun && (
          <div className="py-4">
            <Sparkles className="mx-auto h-10 w-10 text-[#6ea43f]" />
            <p className="mt-3 font-[family-name:var(--font-playfair-display)] text-xl font-semibold text-[#1e3157]">
              You've already spun!
            </p>
            <p className="mt-1 text-sm text-[#2A4C6A]/75">
              Check your inbox for your coupon, or use the one already on your account.
            </p>
            <Button className="mt-4" variant="outline" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          </div>
        )}

        {result && !result.alreadySpun && (
          <div className="py-4">
            <Gift className="mx-auto h-10 w-10 text-[#d965c9]" />
            <p className="mt-3 font-[family-name:var(--font-playfair-display)] text-xl font-semibold text-[#1e3157]">
              You won {result.prizeLabel}!
            </p>
            <p className="mt-3 rounded-lg border-2 border-dashed border-[#d4d4d8] p-3 text-lg font-bold tracking-widest text-[#1e3157]">
              {result.couponCode}
            </p>
            <p className="mt-2 text-xs text-[#2A4C6A]/65">
              Applied automatically at checkout — or enter it manually.
            </p>
            <Button
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white"
              onClick={() => handleOpenChange(false)}
            >
              Continue shopping
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
