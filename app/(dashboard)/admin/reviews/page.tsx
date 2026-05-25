"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Search, Star, AlertTriangle, TrendingUp, MessageSquare, Shuffle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AdminReview } from "@/app/api/admin/reviews/route";

type RatingFilter = "all" | "negative" | "neutral" | "positive";

const FILTER_OPTIONS: { value: RatingFilter; label: string; min: number; max: number }[] = [
  { value: "all",      label: "All",      min: 1, max: 5 },
  { value: "negative", label: "Negative", min: 1, max: 3 },
  { value: "positive", label: "Positive", min: 4, max: 5 },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{rating}/5</span>
    </div>
  );
}

interface ReviewsApiResponse {
  success: boolean;
  data: AdminReview[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    stats: {
      totalAll: number;
      averageRating: number | null;
      ratingCounts: Record<number, number>;
      negativeCount: number;
    };
  };
}

export default function AdminReviewsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RatingFilter>("negative");
  const [page, setPage] = useState(1);

  const selectedFilter = FILTER_OPTIONS.find((f) => f.value === filter)!;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/reviews/generate", { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Generation failed");
      return json.data as { generated: number; products: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({
        title: `Generated ${data.generated} reviews across ${data.products} products`,
      });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const { data, isLoading, isError, error } = useQuery<ReviewsApiResponse>({
    queryKey: ["admin-reviews", search, filter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        minRating: String(selectedFilter.min),
        maxRating: String(selectedFilter.max),
      });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/reviews?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load reviews (${res.status})`);
      return json;
    },
  });

  const reviews = data?.data ?? [];
  const meta = data?.meta;
  const stats = meta?.stats;

  const columns = [
    {
      key: "rating",
      label: "Rating",
      className: "w-36",
      render: (r: AdminReview) => (
        <div className="flex flex-col gap-1">
          <StarRating rating={r.rating} />
          {r.rating <= 3 && (
            <Badge variant="destructive" className="w-fit text-xs py-0">
              Negative
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "product",
      label: "Product",
      className: "w-48",
      render: (r: AdminReview) => (
        <span className="text-sm font-medium">{r.productName}</span>
      ),
    },
    {
      key: "reviewer",
      label: "Reviewer",
      className: "w-44",
      render: (r: AdminReview) => (
        <div>
          <p className="text-sm font-medium">{r.reviewerName}</p>
          <p className="text-xs text-muted-foreground">{r.reviewerEmail}</p>
        </div>
      ),
    },
    {
      key: "review",
      label: "Review",
      render: (r: AdminReview) => (
        <p className="text-sm text-muted-foreground line-clamp-2">{r.text}</p>
      ),
    },
    {
      key: "date",
      label: "Date",
      className: "w-28",
      render: (r: AdminReview) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(r.createdAt).toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <Header
        title="Product Reviews"
        subtitle="Monitor customer feedback and flag negative reviews"
      />
      <div className="flex-1 p-6 space-y-5">
        {isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error ? error.message : "Unable to load reviews."}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Total</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalAll}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Star className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Avg Rating</span>
              </div>
              <p className="text-2xl font-bold">
                {stats.averageRating !== null ? stats.averageRating.toFixed(1) : "—"}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-destructive mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Negative</span>
              </div>
              <p className="text-2xl font-bold text-destructive">{stats.negativeCount}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">5-Star</span>
              </div>
              <p className="text-2xl font-bold">{stats.ratingCounts[5] ?? 0}</p>
            </div>
          </div>
        )}

        {/* Rating breakdown bar */}
        {stats && stats.totalAll > 0 && (
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Rating breakdown</p>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.ratingCounts[star] ?? 0;
                const pct = stats.totalAll > 0 ? Math.round((count / stats.totalAll) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-4 text-right text-muted-foreground">{star}</span>
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${star <= 3 ? "bg-destructive" : "bg-amber-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search product, reviewer, review..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Shuffle className="h-4 w-4 mr-2" />
              )}
              Generate Reviews
            </Button>
            {FILTER_OPTIONS.map((f) => (
              <Button
                key={f.value}
                size="sm"
                variant={filter === f.value ? "default" : "outline"}
                onClick={() => { setFilter(f.value); setPage(1); }}
                className={f.value === "negative" && filter !== "negative" ? "border-destructive/50 text-destructive hover:bg-destructive/10" : ""}
              >
                {f.value === "negative" && stats?.negativeCount ? (
                  <span className="flex items-center gap-1.5">
                    {f.label}
                    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                      {stats.negativeCount}
                    </span>
                  </span>
                ) : (
                  f.label
                )}
              </Button>
            ))}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {meta?.total === 1 ? "1 review" : `${meta?.total ?? 0} reviews`}
          {filter !== "all" && ` matching "${selectedFilter.label.toLowerCase()}" filter`}
        </p>

        <DataTable
          columns={columns}
          data={reviews}
          loading={isLoading}
          keyExtractor={(r) => r.id}
          emptyMessage={
            filter === "negative"
              ? "No negative reviews — great job!"
              : "No reviews found."
          }
          rowClassName={(r: AdminReview) =>
            r.rating <= 3 ? "bg-destructive/5 hover:bg-destructive/10" : ""
          }
        />

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
