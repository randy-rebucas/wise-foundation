import type { PublicMarketplaceReview } from "@/lib/services/marketplace.service";

export type ReviewStats = {
  averageRating: number | null;
  reviewCount: number;
  fiveStarCount?: number;
};

export function formatReviewDate(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days >= 14 ? "s" : ""} ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function computeReviewStats(reviews: Pick<PublicMarketplaceReview, "rating">[]): ReviewStats {
  if (!reviews.length) return { averageRating: null, reviewCount: 0 };
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  return {
    averageRating: Math.round((sum / reviews.length) * 10) / 10,
    reviewCount: reviews.length,
  };
}

export function formatReviewAverage(stats: ReviewStats) {
  if (stats.averageRating == null) return "—";
  return stats.averageRating.toFixed(1);
}
