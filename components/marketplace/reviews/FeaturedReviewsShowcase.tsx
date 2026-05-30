"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, ChevronLeft, ChevronRight, Loader2, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/marketplace/reviews/StarRating";
import { MarkdownContent } from "@/components/shared/MarkdownContent";
import { cloudinaryTransformedUrl } from "@/lib/utils/cloudinaryTransform";
import { formatReviewDate } from "@/lib/marketplace/reviews";
import { usePublicReviews } from "@/components/marketplace/reviews/usePublicReviews";
import type { PublicReview } from "@/components/marketplace/reviews/PublicReviewCard";

/* ─── Hero card (left, large) ─────────────────────────────────────── */
function HeroReviewCard({ review }: { review: PublicReview }) {
  const image = review.images?.[0];
  return (
    <Link
      href={`/reviews/${review.id}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-[#d965c9]/30 bg-white/60 shadow-[0_24px_60px_rgba(94,70,135,0.18)] backdrop-blur transition hover:-translate-y-1 hover:shadow-[0_30px_72px_rgba(94,70,135,0.22)]"
    >
      {/* Image */}
      {image ? (
        <div className="relative h-64 w-full shrink-0 overflow-hidden sm:h-72 lg:h-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cloudinaryTransformedUrl(image, { width: 800, crop: "limit" })}
            alt={`${review.reviewerName}'s review`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-[#d965c9]/90 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white shadow backdrop-blur-sm">
            <Sparkles className="h-3 w-3" />
            Featured
          </span>
          {/* Rating overlay on image */}
          <div className="absolute bottom-4 left-4">
            <StarRating rating={review.rating} size="md" />
          </div>
        </div>
      ) : (
        <div className="flex h-20 items-center px-6 pt-6">
          <span className="flex items-center gap-1.5 rounded-full bg-[#d965c9]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#d965c9]">
            <Sparkles className="h-3 w-3" />
            Featured
          </span>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 flex-col p-6">
        {!image && (
          <div className="mb-4">
            <StarRating rating={review.rating} size="md" />
          </div>
        )}

        {/* Quote */}
        <div className="flex-1 [&_p]:text-[#2A4C6A]/85 [&_p]:text-sm [&_p]:leading-7 [&_strong]:text-[#1e3157] [&_blockquote]:border-[#d965c9]/40">
          <MarkdownContent content={review.text} />
        </div>

        {/* Reviewer row */}
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/60 pt-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
              {review.reviewerName.charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="text-sm font-semibold text-[#1e3157]">{review.reviewerName}</p>
              <p className="flex items-center gap-1 text-[11px] font-medium text-[#6ea43f]">
                Verified buyer <BadgeCheck className="h-3 w-3" aria-hidden />
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="truncate text-xs font-semibold text-[#6ea43f]">{review.productName}</p>
            <p className="text-[11px] text-[#2A4C6A]/50">{formatReviewDate(review.createdAt)}</p>
          </div>
        </div>

        <span className="mt-4 flex items-center gap-1 self-end text-xs font-semibold text-[#d965c9]">
          Read full review <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

/* ─── Mini card (right carousel item) ─────────────────────────────── */
function MiniReviewCard({ review }: { review: PublicReview }) {
  const image = review.images?.[0];
  return (
    <Link
      href={`/reviews/${review.id}`}
      className="group flex shrink-0 snap-start gap-3 rounded-2xl border border-white/65 bg-white/55 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/70 hover:shadow-[0_12px_36px_rgba(94,70,135,0.14)]"
    >
      {/* Thumbnail */}
      {image ? (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cloudinaryTransformedUrl(image, { width: 200, crop: "fill" })}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        </div>
      ) : (
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-xl font-bold text-violet-700">
          {review.reviewerName.charAt(0).toUpperCase()}
        </span>
      )}

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="truncate text-sm font-semibold text-[#1e3157]">{review.reviewerName}</p>
            <StarRating rating={review.rating} size="sm" className="mt-0.5" />
          </div>
          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2A4C6A]/30 transition group-hover:text-[#d965c9]" />
        </div>
        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#2A4C6A]/75">
          {review.text.replace(/[#*_>`[\]]/g, "")}
        </p>
        <p className="mt-1 truncate text-[11px] font-semibold text-[#6ea43f]">{review.productName}</p>
      </div>
    </Link>
  );
}

/* ─── Main showcase ────────────────────────────────────────────────── */
export function FeaturedReviewsShowcase() {
  const { reviews, loading, error } = usePublicReviews({ featuredOnly: true, limit: 12 });
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "up" | "down") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ top: dir === "down" ? 200 : -200, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-white/70 bg-white/30 py-16">
        <Loader2 className="h-7 w-7 animate-spin text-[#d965c9]" />
        <p className="text-sm text-[#2A4C6A]/70">Loading featured reviews…</p>
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
      <div className="rounded-2xl border border-dashed border-[#d965c9]/30 bg-white/35 px-6 py-12 text-center">
        <Star className="mx-auto h-10 w-10 text-[#FBC02D]/80" aria-hidden />
        <p className="mt-4 font-[family-name:var(--font-playfair-display)] text-lg font-semibold text-[#3c2e60]">
          No featured reviews yet
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#2A4C6A]/75">
          Mark reviews as featured from the admin panel to spotlight them here.
        </p>
      </div>
    );
  }

  const [hero, ...rest] = reviews;
  const sideItems = rest.slice(0, 4);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
      {/* Left — hero card */}
      <HeroReviewCard review={hero} />

      {/* Right — vertical mini carousel */}
      <div className="flex flex-col gap-2">
        {/* Scroll controls */}
        {sideItems.length > 3 && (
          <div className="hidden justify-end gap-1.5 lg:flex">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-white/70 bg-white/55 text-[#3c2e60] shadow-sm backdrop-blur hover:bg-white/75"
              onClick={() => scroll("up")}
              aria-label="Scroll up"
            >
              <ChevronLeft className="h-3.5 w-3.5 rotate-90" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-white/70 bg-white/55 text-[#3c2e60] shadow-sm backdrop-blur hover:bg-white/75"
              onClick={() => scroll("down")}
              aria-label="Scroll down"
            >
              <ChevronRight className="h-3.5 w-3.5 rotate-90" />
            </Button>
          </div>
        )}

        {/* Mini cards — vertical scroll on desktop, horizontal on mobile */}
        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:max-h-[520px] lg:snap-y lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0"
        >
          {sideItems.map((r) => (
            <div key={r.id} className="min-w-[82%] snap-start sm:min-w-[22rem] lg:min-w-0 lg:w-full">
              <MiniReviewCard review={r} />
            </div>
          ))}
        </div>

        {reviews.length > 5 && (
          <Button variant="outline" size="sm" className="mt-1 w-full rounded-xl border-white/70 bg-white/55 text-[#2A4C6A]" asChild>
            <Link href="/reviews">
              View all {reviews.length} featured reviews
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
