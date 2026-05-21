"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Loader2, Star } from "lucide-react";

interface PublicReview {
  id: string;
  productId: string;
  productName: string;
  productSlug?: string;
  rating: number;
  text: string;
  createdAt: string;
  reviewerName: string;
}

function formatReviewDate(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days >= 14 ? "s" : ""} ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function PublicReviewsList() {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/marketplace/reviews?limit=50");
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to load reviews");
        if (!cancelled) setReviews(json.data ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load reviews");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    if (!reviews.length) return { avg: "—", count: 0 };
    const sum = reviews.reduce((s, r) => s + r.rating, 0);
    const avg = (sum / reviews.length).toFixed(1);
    return { avg, count: reviews.length };
  }, [reviews]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/70 bg-white/30 py-16">
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
      <div className="rounded-2xl border border-dashed border-white/70 bg-white/35 px-6 py-14 text-center">
        <Star className="mx-auto h-10 w-10 text-[#FBC02D]/80" aria-hidden />
        <p className="mt-4 font-[family-name:var(--font-playfair-display)] text-lg font-semibold text-[#1e3157]">
          No reviews yet
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#2A4C6A]/75">
          Be the first to share your experience after your order arrives.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-white/60 bg-white/45 px-4 py-3 text-center sm:justify-between sm:text-left">
        <p className="text-sm font-medium text-[#1e3157]">
          <span className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#6ea43f]">
            {stats.avg}
          </span>
          <span className="text-[#2A4C6A]/70"> / 5 average</span>
        </p>
        <p className="text-sm text-[#2A4C6A]/72">
          {stats.count} verified review{stats.count === 1 ? "" : "s"}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => (
          <article
            key={review.id}
            className="flex flex-col rounded-2xl border border-white/65 bg-white/55 p-5 shadow-[0_8px_30px_rgba(94,70,135,0.08)] backdrop-blur transition hover:border-white hover:bg-white/70 hover:shadow-[0_14px_40px_rgba(94,70,135,0.12)]"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
                {review.reviewerName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#1e3157]">{review.reviewerName}</p>
                  <span className="text-[11px] text-[#2A4C6A]/55">{formatReviewDate(review.createdAt)}</span>
                </div>
                <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-[#6ea43f]">
                  Verified buyer
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-0.5 text-[#FBC02D]" aria-label={`${review.rating} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < review.rating ? "fill-current" : "opacity-25"}`}
                  aria-hidden
                />
              ))}
            </div>
            <p className="mt-3 flex-1 text-sm leading-6 text-[#2A4C6A]/85">&ldquo;{review.text}&rdquo;</p>
            {review.productSlug ? (
              <Link
                href={`/product/${review.productSlug}`}
                className="mt-3 block text-xs font-semibold text-[#6ea43f] hover:underline"
              >
                {review.productName}
              </Link>
            ) : (
              <p className="mt-3 text-xs font-semibold text-[#1e3157]/75">{review.productName}</p>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
