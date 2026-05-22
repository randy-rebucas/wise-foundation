import { formatReviewAverage, type ReviewStats } from "@/lib/marketplace/reviews";

type ReviewStatsBarProps = {
  stats: ReviewStats;
  className?: string;
};

export function ReviewStatsBar({ stats, className }: ReviewStatsBarProps) {
  if (!stats.reviewCount) return null;
  return (
    <div
      className={
        className ??
        "mb-6 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-white/60 bg-white/45 px-4 py-3 text-center sm:justify-between sm:text-left"
      }
    >
      <p className="text-sm font-medium text-[#1e3157]">
        <span className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#6ea43f]">
          {formatReviewAverage(stats)}
        </span>
        <span className="text-[#2A4C6A]/70"> / 5 average</span>
      </p>
      <p className="text-sm text-[#2A4C6A]/72">
        {stats.reviewCount} verified review{stats.reviewCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}
