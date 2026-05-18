"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Crown,
  Heart,
  Loader2,
  ShoppingBag,
  Star,
} from "lucide-react";
import { AccountPageHeader } from "@/components/marketplace/account/AccountPageHeader";
import { OrdersList } from "@/components/marketplace/account/OrdersList";
import { formatMemberSince, formatPhone } from "@/components/marketplace/account/orderUtils";
import { useMarketplaceCartStore } from "@/store/marketplaceCartStore";
import { useMarketplaceWishlistStore } from "@/store/marketplaceWishlistStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CustomerOrderRow } from "@/lib/services/customerOrders.service";

type DashboardProfile = {
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  memberSince: string;
};

type DashboardData = {
  profile: DashboardProfile;
  orders: CustomerOrderRow[];
  rewardPoints: number;
  memberDiscountPercent: number;
  accountStatusLabel: string;
  isPremiumMember: boolean;
};

export default function ShopAccountPage() {
  const cartCount = useMarketplaceCartStore((s) => s.getCount());
  const wishlistCount = useMarketplaceWishlistStore((s) => s.getCount());
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoadError("");
    try {
      const res = await fetch("/api/account/dashboard");
      const json = await res.json();
      if (!res.ok || !json.success) {
        setLoadError(json.error ?? "Could not load account");
        setDashboard(null);
        return;
      }
      setDashboard(json.data as DashboardData);
    } catch {
      setLoadError("Could not load account");
      setDashboard(null);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadDashboard();
    });
  }, [loadDashboard]);

  const profile = dashboard?.profile;
  const orders = dashboard?.orders ?? [];
  const firstName = profile?.name?.split(" ")[0] ?? "there";
  const recentOrders = orders.slice(0, 3);
  const totalOrders = orders.length;
  const rewardPoints = dashboard?.rewardPoints ?? 0;
  const accountStatus = dashboard?.accountStatusLabel ?? "—";
  const isPremium = dashboard?.isPremiumMember ?? false;

  const stats = [
    {
      title: "Total Orders",
      value: dashboard ? String(totalOrders) : "—",
      icon: ShoppingBag,
      tone: "bg-emerald-100 text-emerald-600",
      href: "/account/orders",
      linkLabel: "View all orders",
    },
    {
      title: "Wishlist Items",
      value: String(wishlistCount),
      icon: Heart,
      tone: "bg-pink-100 text-pink-600",
      href: "/account/wishlist",
      linkLabel: "View wishlist",
    },
    {
      title: "Reward Points",
      value: dashboard ? rewardPoints.toLocaleString() : "—",
      icon: Star,
      tone: "bg-violet-100 text-violet-600",
      href: "/account/rewards",
      linkLabel: "View rewards",
    },
    {
      title: "Account Status",
      value: dashboard ? accountStatus : "—",
      icon: Crown,
      tone: isPremium ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-600",
      href: "/account/rewards",
      linkLabel: isPremium ? "View benefits" : "Learn more",
    },
  ];

  return (
    <>
      <AccountPageHeader
        title="My Dashboard"
        description={`Welcome back, ${firstName}! Here's what's happening with your account.`}
      />

      {loadError ? <p className="mt-4 text-sm text-destructive">{loadError}</p> : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.title}
            className="rounded-2xl border border-white/65 bg-white/60 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2A4C6A]/60">
                  {stat.title}
                </p>
                <p className="mt-2 text-2xl font-bold text-[#1e3157]">{stat.value}</p>
              </div>
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", stat.tone)}>
                <stat.icon className="h-5 w-5" />
              </span>
            </div>
            <Link href={stat.href} className="mt-3 inline-block text-xs font-semibold text-[#6ea43f] hover:underline">
              {stat.linkLabel}
            </Link>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="rounded-2xl border border-white/65 bg-white/60 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-[#1e3157]">Recent Orders</h2>
            <Link href="/account/orders" className="text-xs font-semibold text-[#6ea43f] hover:underline">
              View All Orders →
            </Link>
          </div>
          <OrdersList
            orders={dashboard ? recentOrders : null}
            loading={!dashboard}
            emptyMessage="No orders yet."
          />
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl border border-white/65 bg-white/60 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-[#1e3157]">Account Overview</h2>
              <Link href="/account/details" className="text-xs font-semibold text-[#6ea43f] hover:underline">
                Edit →
              </Link>
            </div>
            {!dashboard ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-[#6ea43f]" />
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                {[
                  ["Full Name", profile?.name ?? "—"],
                  ["Email Address", profile?.email ?? "—"],
                  ["Phone Number", formatPhone(profile?.phone ?? null)],
                  ["Member Since", formatMemberSince(profile?.memberSince ?? "")],
                  ["Cart Items", String(cartCount)],
                  [
                    "Account Status",
                    accountStatus,
                    isPremium ? "text-violet-700" : undefined,
                  ],
                ].map(([label, value, valueClass]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-4 border-b border-white/50 pb-2 last:border-0 last:pb-0"
                  >
                    <dt className="text-[#2A4C6A]/65">{label}</dt>
                    <dd className={cn("text-right font-semibold text-[#1e3157]", valueClass)}>
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          {dashboard && isPremium ? (
            <section className="overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-100/90 via-pink-50/80 to-white/70 p-5 shadow-sm">
              <p className="font-semibold text-[#1e3157]">You&apos;re a Premium Member! ✨</p>
              <p className="mt-2 text-sm leading-6 text-[#2A4C6A]/75">
                Enjoy exclusive deals, early access to new products, and bonus reward points on
                every purchase. You have {rewardPoints.toLocaleString()} reward points.
              </p>
              <Button asChild className="mt-4 rounded-xl bg-violet-600 text-white hover:bg-violet-700">
                <Link href="/account/rewards">View Benefits</Link>
              </Button>
            </section>
          ) : dashboard ? (
            <section className="rounded-2xl border border-white/65 bg-white/60 p-5 shadow-sm">
              <p className="font-semibold text-[#1e3157]">Earn reward points</p>
              <p className="mt-2 text-sm leading-6 text-[#2A4C6A]/75">
                You have {rewardPoints.toLocaleString()} points from purchases. Place more orders
                to unlock premium perks.
              </p>
              <Button asChild className="mt-4 rounded-xl bg-[#6ea43f] text-white hover:bg-[#5d9235]">
                <Link href="/shop">Shop now</Link>
              </Button>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
