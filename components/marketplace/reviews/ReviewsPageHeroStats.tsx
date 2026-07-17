"use client";

import { BadgeCheck, Loader2, MessageCircle, Star } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePublicReviews } from "@/components/marketplace/reviews/usePublicReviews";
import { StarRating } from "@/components/marketplace/reviews/StarRating";
import { formatReviewAverage } from "@/lib/marketplace/reviews";

type ReviewsPageHeroStatsProps = {
  appName: string;
};

export function ReviewsPageHeroStats({ appName }: ReviewsPageHeroStatsProps) {
  const { stats, loading } = usePublicReviews({ limit: 1 });

  const highlights = loading
    ? null
    : stats.reviewCount > 0
      ? [
          {
            label: "Average rating",
            value: `${formatReviewAverage(stats)} / 5`,
            icon: Star,
            tone: "bg-amber-100 text-amber-600",
          },
          {
            label: "Verified reviews",
            value: String(stats.reviewCount),
            icon: BadgeCheck,
            tone: "bg-emerald-100 text-emerald-600",
          },
          {
            label: "Five-star reviews",
            value: String(stats.fiveStarCount ?? 0),
            icon: MessageCircle,
            tone: "bg-violet-100 text-violet-600",
          },
        ]
      : [
          {
            label: "Your voice",
            value: "Be first",
            icon: BadgeCheck,
            tone: "bg-emerald-100 text-emerald-600",
          },
          {
            label: "After delivery",
            value: "Leave a review",
            icon: MessageCircle,
            tone: "bg-violet-100 text-violet-600",
          },
          {
            label: "Shop",
            value: "Browse",
            icon: Star,
            tone: "bg-amber-100 text-amber-600",
          },
        ];

  return (
    <>
      <p className="mt-5 max-w-md text-base leading-7 text-[#1e3157]/82">
        {stats.reviewCount > 0 ? (
          <>
            Real experiences from verified {appName} buyers — {stats.reviewCount} review
            {stats.reviewCount === 1 ? "" : "s"} and counting.
          </>
        ) : (
          <>
            Real experiences from real people. Be the first to review {appName} after your order
            is delivered.
          </>
        )}
      </p>

      {loading ? (
        <div className="mt-8 flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-[#6ea43f]" aria-hidden />
        </div>
      ) : highlights ? (
        <div className="mt-8 flex w-full gap-3">
          {highlights.map((stat) => (
            <article
              key={stat.label}
              className="flex min-w-0 flex-1 basis-0 flex-col items-center gap-2 rounded-[10px] border border-white/55 bg-white/40 p-3 text-center"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${stat.tone}`}
              >
                <stat.icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 w-full">
                <p className="font-[family-name:var(--font-playfair-display)] text-sm font-semibold leading-snug text-[#1e3157] sm:text-base">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[10px] font-medium leading-tight text-[#2A4C6A]/70 sm:text-[11px]">
                  {stat.label}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <Button
        className="mt-8 rounded-[10px] bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white shadow-md hover:opacity-95"
        asChild
      >
        <Link href="/shop">Shop bestsellers</Link>
      </Button>
    </>
  );
}

export function ReviewsPageHeroStars() {
  const { stats, loading } = usePublicReviews({ limit: 1 });

  if (loading) {
    return (
      <div className="absolute bottom-6 left-[40%] flex items-center gap-2 rounded-full border border-white/75 bg-white/80 px-3 py-2 shadow-md backdrop-blur">
        <Loader2 className="h-4 w-4 animate-spin text-[#6ea43f]" aria-hidden />
      </div>
    );
  }

  if (!stats.reviewCount || stats.averageRating == null) {
    return null;
  }

  const rounded = Math.min(5, Math.max(1, Math.round(stats.averageRating)));

  return (
    <div className="absolute bottom-6 left-[40%] flex items-center gap-2 rounded-full border border-white/75 bg-white/80 px-3 py-2 shadow-md backdrop-blur">
      <StarRating rating={rounded} />
      <span className="text-xs font-semibold text-[#1e3157]">
        {formatReviewAverage(stats)} ({stats.reviewCount})
      </span>
    </div>
  );
}
