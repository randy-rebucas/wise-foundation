import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import type { PublicMarketplaceReview } from "@/lib/services/marketplace.service";
import { formatReviewDate } from "@/lib/marketplace/reviews";
import { StarRating } from "@/components/marketplace/reviews/StarRating";
import { cn } from "@/lib/utils";

export type PublicReview = PublicMarketplaceReview;

type PublicReviewCardProps = {
  review: PublicReview;
  variant?: "grid" | "carousel";
  showProduct?: boolean;
  className?: string;
};

export function PublicReviewCard({
  review,
  variant = "grid",
  showProduct = true,
  className,
}: PublicReviewCardProps) {
  const isCarousel = variant === "carousel";

  return (
    <article
      className={cn(
        "flex flex-col backdrop-blur transition",
        isCarousel
          ? "min-w-[82%] snap-start rounded-3xl border border-white/60 bg-white/50 p-5 shadow-sm hover:-translate-y-0.5 hover:bg-white/65 hover:shadow-[0_18px_45px_rgba(94,70,135,0.16)] sm:min-w-[22rem] lg:min-w-[calc((100%_-_2rem)/3)]"
          : "rounded-2xl border border-white/65 bg-white/55 p-5 shadow-[0_8px_30px_rgba(94,70,135,0.08)] hover:border-white hover:bg-white/70 hover:shadow-[0_14px_40px_rgba(94,70,135,0.12)]",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-violet-100 font-semibold text-violet-700",
            isCarousel ? "h-12 w-12 text-sm" : "h-11 w-11 text-sm"
          )}
        >
          {review.reviewerName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#1e3157] sm:text-[#3c2e60]">
              {isCarousel ? `— ${review.reviewerName}` : review.reviewerName}
            </p>
            {!isCarousel ? (
              <span className="text-[11px] text-[#2A4C6A]/55">
                {formatReviewDate(review.createdAt)}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-[#6ea43f]">
            Verified buyer
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
          </p>
        </div>
      </div>
      <div className="mt-3">
        <StarRating rating={review.rating} />
      </div>
      <p
        className={cn(
          "flex-1 text-sm leading-6 text-[#2A4C6A]/85",
          isCarousel ? "mt-4 min-h-[4.5rem]" : "mt-3"
        )}
      >
        &ldquo;{review.text}&rdquo;
      </p>
      {showProduct ? (
        review.productSlug ? (
          <Link
            href={`/product/${encodeURIComponent(review.productSlug)}`}
            className="mt-3 block text-xs font-semibold text-[#6ea43f] hover:underline"
          >
            {review.productName}
          </Link>
        ) : (
          <p className="mt-3 text-xs font-semibold text-[#1e3157]/75">{review.productName}</p>
        )
      ) : null}
    </article>
  );
}
