"use client";

import Link from "next/link";
import { Loader2, Star } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PublicReviewCard } from "@/components/marketplace/reviews/PublicReviewCard";
import { ReviewStatsBar } from "@/components/marketplace/reviews/ReviewStatsBar";
import { usePublicReviews } from "@/components/marketplace/reviews/usePublicReviews";

const PAGE_SIZE = 9;

type PublicReviewsListProps = {
  limit?: number;
  productId?: string;
};

export function PublicReviewsList({ limit = 100, productId }: PublicReviewsListProps) {
  const { reviews, stats, loading, error } = usePublicReviews({ limit, productId });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed border-white/70 bg-white/30 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#6ea43f]" aria-hidden />
        <p className="text-sm text-[#2A4C6A]/70">Loading reviews…</p>
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-[10px] border border-red-200/80 bg-red-50/80 py-8 text-center text-sm text-red-800/90">
        {error}
      </p>
    );
  }

  if (!reviews.length) {
    return (
      <div className="rounded-[10px] border border-dashed border-white/70 bg-white/35 px-6 py-14 text-center">
        <Star className="mx-auto h-10 w-10 text-[#FBC02D]/80" aria-hidden />
        <p className="mt-4 font-[family-name:var(--font-playfair-display)] text-lg font-semibold text-[#1e3157]">
          No reviews yet
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#2A4C6A]/75">
          Be the first to share your experience after your order arrives.
        </p>
        <Button variant="outline" className="mt-4 rounded-[10px] border-white/70 bg-white/55" asChild>
          <Link href="/account/reviews">Write a review</Link>
        </Button>
      </div>
    );
  }

  const visible = reviews.slice(0, visibleCount);
  const remaining = reviews.length - visibleCount;
  const hasMore = remaining > 0;

  return (
    <>
      <ReviewStatsBar stats={stats} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((review) => (
          <PublicReviewCard key={review.id} review={review} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <Button
            variant="outline"
            className="rounded-[10px] border-white/70 bg-white/55 px-8"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          >
            Load more reviews
            <span className="ml-2 text-xs text-[#2A4C6A]/60">
              ({remaining} remaining)
            </span>
          </Button>
        </div>
      )}
    </>
  );
}
