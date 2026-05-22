"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { StarRating } from "@/components/marketplace/reviews/StarRating";
import { usePublicReviews } from "@/components/marketplace/reviews/usePublicReviews";
import { formatReviewAverage } from "@/lib/marketplace/reviews";

type ProductReviewSummaryProps = {
  productId: string;
};

export function ProductReviewSummary({ productId }: ProductReviewSummaryProps) {
  const { stats, loading } = usePublicReviews({ productId, limit: 1 });

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-[#6ea43f]/70" aria-label="Loading rating" />;
  }

  if (!stats.reviewCount) return null;

  return (
    <Link
      href="#product-reviews"
      className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/65 bg-white/50 px-3 py-1.5 text-sm transition hover:bg-white/70"
    >
      <StarRating rating={Math.round(stats.averageRating ?? 0)} size="sm" />
      <span className="font-medium text-[#2A4C6A]/85">
        {formatReviewAverage(stats)} ({stats.reviewCount})
      </span>
    </Link>
  );
}
