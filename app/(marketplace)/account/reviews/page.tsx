"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, MessageCircle, Star } from "lucide-react";
import { AccountPageHeader } from "@/components/marketplace/account/AccountPageHeader";
import { InteractiveStarRating } from "@/components/marketplace/reviews/StarRating";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { MarketplaceCustomerReview } from "@/lib/types/customerAccount";
import type { CustomerOrderRow } from "@/lib/services/customerOrders.service";

type ReviewableProduct = {
  productId: string;
  productName: string;
  productSlug?: string;
  orderNumber: string;
};

export default function AccountReviewsPage() {
  const searchParams = useSearchParams();
  const [reviews, setReviews] = useState<MarketplaceCustomerReview[]>([]);
  const [reviewable, setReviewable] = useState<ReviewableProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState<{
    productId: string;
    productName: string;
    productSlug?: string;
    rating: number;
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [reviewsRes, ordersRes] = await Promise.all([
        fetch("/api/account/reviews"),
        fetch("/api/account/orders"),
      ]);
      const reviewsJson = await reviewsRes.json();
      const ordersJson = await ordersRes.json();

      const myReviews =
        reviewsRes.ok && reviewsJson.success
          ? (reviewsJson.data as MarketplaceCustomerReview[])
          : [];
      setReviews(myReviews);

      if (ordersRes.ok && ordersJson.success) {
        const orders = ordersJson.data as CustomerOrderRow[];
        const reviewedIds = new Set(myReviews.map((r) => r.productId));
        const products: ReviewableProduct[] = [];
        for (const order of orders) {
          if (!["delivered", "completed"].includes(order.status.toLowerCase())) continue;
          for (const item of order.lineItems) {
            if (!reviewedIds.has(item.productId)) {
              products.push({
                productId: item.productId,
                productName: item.productName,
                productSlug: item.productSlug,
                orderNumber: order.orderNumber,
              });
              reviewedIds.add(item.productId);
            }
          }
        }
        setReviewable(products);
      }
    } catch {
      setError("Could not load reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    if (loading || draft) return;
    const productId = searchParams.get("productId")?.trim();
    if (!productId) return;
    const match = reviewable.find((p) => p.productId === productId);
    if (!match) return;
    setDraft({
      productId: match.productId,
      productName: match.productName,
      productSlug: match.productSlug,
      rating: 5,
      text: "",
    });
  }, [loading, draft, reviewable, searchParams]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/account/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Could not submit review");
        return;
      }
      setDraft(null);
      await load();
    } catch {
      setError("Could not submit review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AccountPageHeader
        title="My Reviews"
        description="Reviews you've shared about Glowish products."
      />

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <div className="mt-8 flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#6ea43f]" />
        </div>
      ) : (
        <>
          {reviews.length > 0 ? (
            <ul className="mt-6 space-y-4">
              {reviews.map((review) => (
                <li
                  key={review.id}
                  className="rounded-2xl border border-white/65 bg-white/60 p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    {review.productSlug ? (
                      <Link
                        href={`/product/${encodeURIComponent(review.productSlug)}`}
                        className="font-semibold text-[#1e3157] hover:text-[#6ea43f] hover:underline"
                      >
                        {review.productName}
                      </Link>
                    ) : (
                      <p className="font-semibold text-[#1e3157]">{review.productName}</p>
                    )}
                    <span className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#2A4C6A]/80">{review.text}</p>
                  <p className="mt-2 text-xs text-[#2A4C6A]/55">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-8 rounded-2xl border border-white/65 bg-white/60 p-8 text-center shadow-sm">
              <MessageCircle className="mx-auto h-10 w-10 text-violet-400" />
              <p className="mt-4 text-sm text-[#2A4C6A]/75">You haven&apos;t written any reviews yet.</p>
            </div>
          )}

          {draft ? (
            <form
              onSubmit={submitReview}
              className="mt-8 rounded-2xl border border-violet-200/70 bg-white/60 p-5 shadow-sm"
            >
              <h2 className="font-semibold text-[#1e3157]">Review {draft.productName}</h2>
              <div className="mt-4">
                <Label>Rating</Label>
                <div className="mt-2">
                  <InteractiveStarRating
                    rating={draft.rating}
                    onChange={(rating) => setDraft((d) => (d ? { ...d, rating } : d))}
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="review-text">Your review</Label>
                <textarea
                  id="review-text"
                  value={draft.text}
                  onChange={(e) => setDraft((d) => (d ? { ...d, text: e.target.value } : d))}
                  required
                  minLength={10}
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm"
                  placeholder="Share your experience with this product…"
                />
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  type="submit"
                  disabled={submitting || draft.text.length < 10}
                  className="rounded-xl bg-[#6ea43f] text-white hover:bg-[#5d9235]"
                >
                  {submitting ? "Submitting…" : "Submit review"}
                </Button>
                <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}

          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#2A4C6A]/60">
              Products you can review
            </h2>
            {reviewable.length === 0 ? (
              <p className="mt-3 text-sm text-[#2A4C6A]/70">
                Complete a delivered order to leave a review.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {reviewable.map((p) => (
                  <li
                    key={p.productId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/65 bg-white/55 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-[#1e3157]">{p.productName}</p>
                      <p className="text-xs text-[#2A4C6A]/60">Order {p.orderNumber}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-xl bg-violet-600 text-white hover:bg-violet-700"
                      onClick={() =>
                        setDraft({
                          productId: p.productId,
                          productName: p.productName,
                          productSlug: p.productSlug,
                          rating: 5,
                          text: "",
                        })
                      }
                    >
                      Write review
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="mt-8 flex justify-center">
            <Button asChild variant="outline" className="rounded-xl border-white/70 bg-white/65">
              <Link href="/shop">Browse more products</Link>
            </Button>
          </div>
        </>
      )}
    </>
  );
}
