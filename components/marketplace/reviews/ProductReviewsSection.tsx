"use client";

import Link from "next/link";
import { Loader2, MessageCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicReviewCard } from "@/components/marketplace/reviews/PublicReviewCard";
import { ReviewStatsBar } from "@/components/marketplace/reviews/ReviewStatsBar";
import { StarRating } from "@/components/marketplace/reviews/StarRating";
import { usePublicReviews } from "@/components/marketplace/reviews/usePublicReviews";
import { formatReviewAverage } from "@/lib/marketplace/reviews";

type ProductReviewsSectionProps = {
  productId: string;
  productName: string;
};

export function ProductReviewsSection({
  productId,
  productName,
}: ProductReviewsSectionProps) {
  const { reviews, stats, loading, error } = usePublicReviews({ productId, limit: 12 });
  const writeHref = `/account/reviews?productId=${encodeURIComponent(productId)}`;

  return (
    <section
      id="product-reviews"
      className="scroll-mt-24 rounded-[2rem] border border-white/60 bg-white/35 p-5 shadow-[0_18px_60px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:p-7"
      aria-labelledby="product-reviews-heading"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6ea43f]">
            Customer reviews
          </p>
          <h2
            id="product-reviews-heading"
            className="mt-2 font-[family-name:var(--font-playfair-display)] text-2xl font-semibold tracking-tight text-[#3c2e60]"
          >
            What buyers say about {productName}
          </h2>
          {stats.reviewCount > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StarRating rating={Math.round(stats.averageRating ?? 0)} />
              <span className="text-sm font-medium text-[#2A4C6A]/80">
                {formatReviewAverage(stats)} · {stats.reviewCount} review
                {stats.reviewCount === 1 ? "" : "s"}
              </span>
            </div>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl border-white/70 bg-white/55"
          asChild
        >
          <Link href={writeHref}>Write a review</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#6ea43f]" aria-hidden />
        </div>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : !reviews.length ? (
        <div className="rounded-2xl border border-dashed border-white/70 bg-white/35 px-6 py-12 text-center">
          <MessageCircle className="mx-auto h-10 w-10 text-violet-400" aria-hidden />
          <p className="mt-4 text-sm text-[#2A4C6A]/75">
            No reviews for this product yet. Purchased {productName}? Share your experience after
            delivery.
          </p>
          <Button className="mt-4 rounded-xl bg-[#6ea43f] text-white hover:bg-[#5d9235]" asChild>
            <Link href={writeHref}>Be the first to review</Link>
          </Button>
        </div>
      ) : (
        <>
          <ReviewStatsBar stats={stats} />
          <div className="grid gap-4 sm:grid-cols-2">
            {reviews.map((review) => (
              <PublicReviewCard key={review.id} review={review} showProduct={false} />
            ))}
          </div>
          {stats.reviewCount > reviews.length ? (
            <p className="mt-4 text-center text-sm text-[#2A4C6A]/70">
              <Link href="/reviews" className="font-semibold text-[#6ea43f] hover:underline">
                See all reviews
              </Link>{" "}
              across the shop
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
