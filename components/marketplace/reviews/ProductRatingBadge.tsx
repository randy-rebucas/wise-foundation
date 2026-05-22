"use client";

import type { ProductReviewSummary } from "@/lib/services/marketplace.service";
import { StarRating } from "@/components/marketplace/reviews/StarRating";
import { cn } from "@/lib/utils";

type ProductRatingBadgeProps = {
  summary?: ProductReviewSummary;
  className?: string;
  countClassName?: string;
};

/** Shows real average + count only when the product has reviews in the database. */
export function ProductRatingBadge({
  summary,
  className,
  countClassName,
}: ProductRatingBadgeProps) {
  if (!summary?.reviewCount) return null;

  const rounded = Math.min(5, Math.max(1, Math.round(summary.averageRating ?? 0)));

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <StarRating rating={rounded} size="sm" />
      <span className={cn("text-[0.65rem] text-[#2A4C6A]/60", countClassName)}>
        ({summary.reviewCount})
      </span>
    </div>
  );
}
