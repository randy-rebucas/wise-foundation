"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Crown, Gift, Loader2, Star } from "lucide-react";
import { AccountPageHeader } from "@/components/marketplace/account/AccountPageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RewardsData = {
  rewardPoints: number;
  memberDiscountPercent: number;
  accountStatusLabel: string;
  isPremiumMember: boolean;
  orders: { total: number; status: string }[];
};

export default function AccountRewardsPage() {
  const [data, setData] = useState<RewardsData | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/account/dashboard");
      const json = await res.json();
      if (res.ok && json.success) {
        const d = json.data;
        setData({
          rewardPoints: d.rewardPoints,
          memberDiscountPercent: d.memberDiscountPercent,
          accountStatusLabel: d.accountStatusLabel,
          isPremiumMember: d.isPremiumMember,
          orders: d.orders,
        });
      }
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#6ea43f]" />
      </div>
    );
  }

  const nextTierPoints = 500;
  const progress = Math.min(100, (data.rewardPoints / nextTierPoints) * 100);

  return (
    <>
      <AccountPageHeader
        title="Rewards & Points"
        description="Earn points on every purchase and unlock member benefits."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-white/65 bg-white/60 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2A4C6A]/60">
              Your points
            </p>
            <Star className="h-5 w-5 text-violet-500" />
          </div>
          <p className="mt-3 text-4xl font-bold text-[#1e3157]">
            {data.rewardPoints.toLocaleString()}
          </p>
          <p className="mt-2 text-sm text-[#2A4C6A]/75">
            1 point per ₱1 spent on completed orders
          </p>
        </article>

        <article className="rounded-2xl border border-white/65 bg-white/60 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2A4C6A]/60">
              Status
            </p>
            <Crown className={cn("h-5 w-5", data.isPremiumMember ? "text-orange-500" : "text-slate-400")} />
          </div>
          <p className="mt-3 text-2xl font-bold text-[#1e3157]">{data.accountStatusLabel}</p>
          <p className="mt-2 text-sm text-[#2A4C6A]/75">
            Member discount: up to {data.memberDiscountPercent}% off
          </p>
        </article>
      </div>

      <section className="mt-6 rounded-2xl border border-white/65 bg-white/60 p-5 shadow-sm">
        <h2 className="font-semibold text-[#1e3157]">Progress to Premium</h2>
        <p className="mt-1 text-sm text-[#2A4C6A]/75">
          Reach {nextTierPoints} points or 5+ orders to unlock premium perks.
        </p>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-400 to-pink-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-[#2A4C6A]/60">
          {data.rewardPoints} / {nextTierPoints} points
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-100/90 via-pink-50/80 to-white/70 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Gift className="h-6 w-6 shrink-0 text-violet-600" />
          <div>
            <p className="font-semibold text-[#1e3157]">How to earn more</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[#2A4C6A]/75">
              <li>Complete checkout on marketplace orders</li>
              <li>Points are added when payment is confirmed</li>
              <li>Premium members get early access to new drops</li>
            </ul>
            <Button asChild className="mt-4 rounded-xl bg-violet-600 text-white hover:bg-violet-700">
              <Link href="/shop">Shop & earn points</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
