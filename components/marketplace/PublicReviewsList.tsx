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
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#6ea43f]" />
      </div>
    );
  }

  if (error) {
    return <p className="py-8 text-center text-sm text-[#2A4C6A]/80">{error}</p>;
  }

  if (!reviews.length) {
    return (
      <p className="py-12 text-center text-sm text-[#2A4C6A]/80">
        No customer reviews yet. Be the first to share your experience after your order arrives.
      </p>
    );
  }

  return (
    <>
      <p className="mb-5 text-center text-sm text-[#2A4C6A]/72">
        {stats.count} verified review{stats.count === 1 ? "" : "s"} · average {stats.avg}/5
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {reviews.map((review) => (
          <article
            key={review.id}
            className="rounded-2xl border border-white/65 bg-white/55 p-4 shadow-sm backdrop-blur"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
                {review.reviewerName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1e3157]">{review.reviewerName}</p>
                <p className="flex items-center gap-1 text-xs font-semibold text-[#6ea43f]">
                  Verified Buyer
                  <BadgeCheck className="h-3.5 w-3.5" />
                </p>
              </div>
              <span className="ml-auto shrink-0 text-[11px] text-[#2A4C6A]/55">
                {formatReviewDate(review.createdAt)}
              </span>
            </div>
            <div className="mt-4 flex gap-0.5 text-[#FBC02D]">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < review.rating ? "fill-current" : "opacity-30"}`}
                />
              ))}
            </div>
            <p className="mt-3 min-h-20 text-sm leading-6 text-[#2A4C6A]/80">{review.text}</p>
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
