import Link from "next/link";
import { BadgeCheck, ArrowRight } from "lucide-react";
import type { PublicMarketplaceReview } from "@/lib/services/marketplace.service";
import { formatReviewDate } from "@/lib/marketplace/reviews";
import { StarRating } from "@/components/marketplace/reviews/StarRating";
import { MarkdownContent } from "@/components/shared/MarkdownContent";
import { cloudinaryTransformedUrl } from "@/lib/utils/cloudinaryTransform";
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
  const featuredImage = review.images?.[0];
  const isFeatured = review.featured;
  const detailHref = `/reviews/${review.id}`;

  const inner = (
    <>
      {/* Featured image banner (carousel only) */}
      {isCarousel && featuredImage ? (
        <div className="relative h-44 w-full overflow-hidden rounded-t-3xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cloudinaryTransformedUrl(featuredImage, { width: 600, crop: "limit" })}
            alt={`${review.reviewerName}'s review photo`}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          {isFeatured && (
            <span className="absolute left-3 top-3 rounded-full bg-[#d965c9]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow backdrop-blur-sm">
              Featured
            </span>
          )}
        </div>
      ) : isCarousel && isFeatured ? (
        <div className="flex items-center px-5 pt-4">
          <span className="rounded-full bg-[#d965c9]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#d965c9]">
            Featured
          </span>
        </div>
      ) : null}

      {/* Reviewer */}
      <div className={cn("flex items-start gap-3", isCarousel ? "px-5 pt-4" : "")}>
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

      {/* Stars */}
      <div className={cn("mt-3", isCarousel ? "px-5" : "")}>
        <StarRating rating={review.rating} />
      </div>

      {/* Review text */}
      <div
        className={cn(
          "flex-1 text-sm leading-6 text-[#2A4C6A]/85 [&_p]:text-[#2A4C6A]/85 [&_p]:text-sm [&_p]:leading-6 [&_strong]:text-[#1e3157] [&_blockquote]:border-[#d965c9]/40 [&_blockquote]:text-[#2A4C6A]/75",
          isCarousel ? "mt-4 line-clamp-4 min-h-[4.5rem] px-5" : "mt-3 line-clamp-5"
        )}
      >
        <MarkdownContent content={review.text} />
      </div>

      {/* Footer */}
      {isCarousel ? (
        <div className="mt-3 flex items-center justify-between px-5 pb-5">
          {showProduct && review.productName ? (
            <p className="text-xs font-semibold text-[#1e3157]/75 truncate">{review.productName}</p>
          ) : <span />}
          <span className="flex items-center gap-1 text-xs font-semibold text-[#6ea43f]">
            Read more <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      ) : showProduct && review.productName ? (
        <p className="mt-3 text-xs font-semibold text-[#6ea43f]">{review.productName}</p>
      ) : null}
    </>
  );

  // Grid variant: whole card is a link
  if (!isCarousel) {
    return (
      <Link href={detailHref} className={cn("group flex flex-col backdrop-blur transition rounded-2xl border border-white/65 bg-white/55 p-5 shadow-[0_8px_30px_rgba(94,70,135,0.08)] hover:border-white hover:bg-white/70 hover:shadow-[0_14px_40px_rgba(94,70,135,0.12)]", className)}>
        {inner}
      </Link>
    );
  }

  // Carousel variant: card links on click
  return (
    <Link
      href={detailHref}
      className={cn(
        "group flex flex-col backdrop-blur transition min-w-[82%] snap-start rounded-3xl border bg-white/50 shadow-sm hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(94,70,135,0.16)] sm:min-w-[22rem] lg:min-w-[calc((100%_-_2rem)/3)]",
        isFeatured ? "border-[#d965c9]/40 hover:bg-white/65" : "border-white/60 hover:bg-white/65",
        className
      )}
    >
      {inner}
    </Link>
  );
}
