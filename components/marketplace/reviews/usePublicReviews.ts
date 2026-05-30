"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicReview } from "@/components/marketplace/reviews/PublicReviewCard";
import { computeReviewStats, type ReviewStats } from "@/lib/marketplace/reviews";

type UsePublicReviewsOptions = {
  limit?: number;
  productId?: string;
  featuredOnly?: boolean;
};

export function usePublicReviews({ limit = 50, productId, featuredOnly }: UsePublicReviewsOptions = {}) {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ averageRating: null, reviewCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ limit: String(limit) });
        if (productId) params.set("productId", productId);
        if (featuredOnly) params.set("featuredOnly", "true");
        const res = await fetch(`/api/marketplace/reviews?${params}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to load reviews");
        if (cancelled) return;
        setReviews(json.data ?? []);
        const meta = json.meta ?? {};
        setStats({
          averageRating:
            typeof meta.averageRating === "number" ? meta.averageRating : null,
          reviewCount:
            typeof meta.reviewCount === "number"
              ? meta.reviewCount
              : (json.data?.length ?? 0),
          fiveStarCount:
            typeof meta.fiveStarCount === "number" ? meta.fiveStarCount : undefined,
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load reviews");
          setReviews([]);
          setStats({ averageRating: null, reviewCount: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit, productId, featuredOnly]);

  const derivedStats = useMemo(() => {
    if (stats.reviewCount > 0 && stats.averageRating != null) return stats;
    return computeReviewStats(reviews);
  }, [reviews, stats]);

  return { reviews, stats: derivedStats, loading, error };
}
