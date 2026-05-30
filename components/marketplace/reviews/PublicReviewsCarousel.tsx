"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicReviewCard } from "@/components/marketplace/reviews/PublicReviewCard";
import { usePublicReviews } from "@/components/marketplace/reviews/usePublicReviews";

type PublicReviewsCarouselProps = {
  limit?: number;
  showAllLink?: boolean;
  featuredOnly?: boolean;
};

export function PublicReviewsCarousel({ limit = 8, showAllLink = true, featuredOnly }: PublicReviewsCarouselProps) {
  const { reviews, loading, error } = usePublicReviews({ limit, featuredOnly });
  const feedbackRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "prev" | "next") => {
    const node = feedbackRef.current;
    if (!node) return;
    const cardWidth = node.firstElementChild?.clientWidth ?? 320;
    node.scrollBy({
      left: direction === "next" ? cardWidth + 16 : -(cardWidth + 16),
      behavior: "smooth",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/70 bg-white/30 py-14">
        <Loader2 className="h-8 w-8 animate-spin text-[#6ea43f]" aria-hidden />
        <p className="text-sm text-[#2A4C6A]/70">Loading reviews…</p>
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200/80 bg-red-50/80 py-8 text-center text-sm text-red-800/90">
        {error}
      </p>
    );
  }

  if (!reviews.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/70 bg-white/35 px-6 py-12 text-center">
        <Star className="mx-auto h-10 w-10 text-[#FBC02D]/80" aria-hidden />
        <p className="mt-4 font-[family-name:var(--font-playfair-display)] text-lg font-semibold text-[#3c2e60]">
          No reviews yet
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#2A4C6A]/75">
          Be the first to share your experience after your order arrives.
        </p>
        {showAllLink ? (
          <Button variant="outline" className="mt-4 rounded-xl border-white/70 bg-white/55" asChild>
            <Link href="/account/reviews">Write a review</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {showAllLink ? (
          <Button variant="outline" className="rounded-xl border-white/70 bg-white/55" asChild>
            <Link href="/reviews">All reviews</Link>
          </Button>
        ) : null}
        <div className="hidden gap-2 sm:ml-auto sm:flex">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full border-white/70 bg-white/55 text-[#3c2e60] shadow-sm backdrop-blur hover:bg-white/75"
            onClick={() => scroll("prev")}
            aria-label="Previous feedback"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full border-white/70 bg-white/55 text-[#3c2e60] shadow-sm backdrop-blur hover:bg-white/75"
            onClick={() => scroll("next")}
            aria-label="Next feedback"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        ref={feedbackRef}
        className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Customer feedback carousel"
      >
        {reviews.map((review) => (
          <PublicReviewCard key={review.id} review={review} variant="carousel" />
        ))}
      </div>
    </>
  );
}
