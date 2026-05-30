"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Star, AlertTriangle, TrendingUp, MessageSquare, Shuffle, Loader2, ImageIcon, Sparkles, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MarkdownEditor } from "@/components/shared/MarkdownEditor";
import { MediaPickerDialog } from "@/components/media/MediaPickerDialog";
import type { AdminReview } from "@/app/api/admin/reviews/route";

type RatingFilter = "all" | "negative" | "positive";

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

type FeatureDialogState = {
  open: boolean;
  review: AdminReview | null;
  featured: boolean;
  imageUrl: string;
};

const EMPTY_CREATE = {
  open: false,
  reviewerName: "",
  reviewerEmail: "",
  productSearch: "",
  productId: "",
  productName: "",
  rating: 5,
  text: "",
  featured: false,
  imageUrl: "",
};

type CreateDialogState = typeof EMPTY_CREATE;

export default function AdminReviewsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RatingFilter>("negative");
  const [page, setPage] = useState(1);
  const [featureDialog, setFeatureDialog] = useState<FeatureDialogState>({
    open: false,
    review: null,
    featured: false,
    imageUrl: "",
  });
  const [createDialog, setCreateDialog] = useState<CreateDialogState>(EMPTY_CREATE);
  const [productResults, setProductResults] = useState<{ _id: string; name: string; slug: string }[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [createMediaOpen, setCreateMediaOpen] = useState(false);
  const [featureMediaOpen, setFeatureMediaOpen] = useState(false);

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
      toast({ title: `Generated ${data.generated} reviews across ${data.products} products` });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const featureMutation = useMutation({
    mutationFn: async (payload: { userId: string; reviewId: string; featured: boolean; images: string[] }) => {
      const res = await fetch("/api/admin/reviews/feature", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to update");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      setFeatureDialog((s) => ({ ...s, open: false }));
      toast({ title: "Review updated" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      reviewerName: string;
      reviewerEmail: string;
      productId: string;
      rating: number;
      text: string;
      featured: boolean;
      images: string[];
    }) => {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to create review");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      setCreateDialog(EMPTY_CREATE);
      setProductResults([]);
      toast({ title: "Review created" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  async function searchProducts(q: string) {
    if (!q.trim()) { setProductResults([]); return; }
    setProductSearchLoading(true);
    try {
      const res = await fetch(`/api/marketplace/products?search=${encodeURIComponent(q)}&limit=8`);
      const json = await res.json();
      setProductResults(json.data ?? []);
    } finally {
      setProductSearchLoading(false);
    }
  }

  function submitCreate() {
    if (!createDialog.productId) { toast({ title: "Select a product", variant: "destructive" }); return; }
    const images = createDialog.imageUrl.trim() ? [createDialog.imageUrl.trim()] : [];
    createMutation.mutate({
      reviewerName: createDialog.reviewerName,
      reviewerEmail: createDialog.reviewerEmail,
      productId: createDialog.productId,
      rating: createDialog.rating,
      text: createDialog.text,
      featured: createDialog.featured,
      images,
    });
  }

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

  function openFeatureDialog(r: AdminReview) {
    setFeatureDialog({
      open: true,
      review: r,
      featured: r.featured,
      imageUrl: r.images[0] ?? "",
    });
  }

  function saveFeature() {
    if (!featureDialog.review) return;
    const images = featureDialog.imageUrl.trim() ? [featureDialog.imageUrl.trim()] : [];
    featureMutation.mutate({
      userId: featureDialog.review.userId,
      reviewId: featureDialog.review.id,
      featured: featureDialog.featured,
      images,
    });
  }

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
          {r.featured && (
            <Badge className="w-fit text-xs py-0 bg-pink-500/90">
              Featured
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
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground line-clamp-2">{r.text}</p>
          {r.images[0] && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ImageIcon className="h-3 w-3" />
              <span className="truncate max-w-[180px]">{r.images[0]}</span>
            </div>
          )}
        </div>
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
    {
      key: "actions",
      label: "",
      className: "w-20",
      render: (r: AdminReview) => (
        <Button
          size="sm"
          variant="outline"
          className="text-xs gap-1"
          onClick={() => openFeatureDialog(r)}
        >
          <Sparkles className="h-3 w-3" />
          Feature
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <Header
        title="Product Reviews"
        subtitle="Monitor customer feedback and manage featured reviews"
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
            <Button
              size="sm"
              onClick={() => { setCreateDialog({ ...EMPTY_CREATE, open: true }); setProductResults([]); }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Review
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

      {/* Feature dialog */}
      <Dialog
        open={featureDialog.open}
        onOpenChange={(open) => setFeatureDialog((s) => ({ ...s, open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Feature this review</DialogTitle>
          </DialogHeader>
          {featureDialog.review && (
            <div className="space-y-5 py-2">
              <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground line-clamp-3">
                &ldquo;{featureDialog.review.text}&rdquo;
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="featured-check"
                  checked={featureDialog.featured}
                  onCheckedChange={(v) => setFeatureDialog((s) => ({ ...s, featured: !!v }))}
                />
                <div>
                  <Label htmlFor="featured-check" className="text-sm font-medium cursor-pointer">
                    Show on homepage carousel
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Featured reviews appear first in the carousel
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Featured image</Label>
                {featureDialog.imageUrl ? (
                  <div className="relative overflow-hidden rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={featureDialog.imageUrl}
                      alt="Featured"
                      className="h-32 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFeatureDialog((s) => ({ ...s, imageUrl: "" }))}
                      className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setFeatureMediaOpen(true)}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Pick from media library
                  </Button>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFeatureDialog((s) => ({ ...s, open: false }))}
            >
              Cancel
            </Button>
            <Button onClick={saveFeature} disabled={featureMutation.isPending}>
              {featureMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Review dialog */}
      <Dialog
        open={createDialog.open}
        onOpenChange={(open) => setCreateDialog((s) => ({ ...s, open }))}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Reviewer */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cr-name">Reviewer name *</Label>
                <Input
                  id="cr-name"
                  placeholder="Maria Santos"
                  value={createDialog.reviewerName}
                  onChange={(e) => setCreateDialog((s) => ({ ...s, reviewerName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cr-email">Reviewer email *</Label>
                <Input
                  id="cr-email"
                  type="email"
                  placeholder="customer@email.com"
                  value={createDialog.reviewerEmail}
                  onChange={(e) => setCreateDialog((s) => ({ ...s, reviewerEmail: e.target.value }))}
                />
              </div>
            </div>

            {/* Product search */}
            <div className="space-y-1.5">
              <Label htmlFor="cr-product">Product *</Label>
              {createDialog.productId ? (
                <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  <span className="flex-1 font-medium">{createDialog.productName}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs text-muted-foreground"
                    onClick={() => setCreateDialog((s) => ({ ...s, productId: "", productName: "", productSearch: "" }))}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="cr-product"
                      className="pl-9"
                      placeholder="Search product name..."
                      value={createDialog.productSearch}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCreateDialog((s) => ({ ...s, productSearch: v }));
                        void searchProducts(v);
                      }}
                    />
                    {productSearchLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {productResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-md border bg-popover shadow-sm">
                      {productResults.map((p) => (
                        <button
                          key={p._id}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                          onClick={() => {
                            setCreateDialog((s) => ({ ...s, productId: p._id, productName: p.name, productSearch: p.name }));
                            setProductResults([]);
                          }}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rating */}
            <div className="space-y-1.5">
              <Label>Rating *</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setCreateDialog((d) => ({ ...d, rating: s }))}
                    className="p-0.5"
                    aria-label={`${s} star`}
                  >
                    <Star
                      className={`h-6 w-6 transition-colors ${
                        s <= createDialog.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30 hover:text-amber-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Text */}
            <div className="space-y-1.5">
              <Label>Review text *</Label>
              <MarkdownEditor
                minRows={4}
                placeholder="Write the review text… supports **bold**, _italic_, > quotes"
                value={createDialog.text}
                onChange={(v) => setCreateDialog((s) => ({ ...s, text: v }))}
              />
            </div>

            {/* Featured + image */}
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="cr-featured"
                  checked={createDialog.featured}
                  onCheckedChange={(v) => setCreateDialog((s) => ({ ...s, featured: !!v }))}
                />
                <Label htmlFor="cr-featured" className="cursor-pointer text-sm font-medium">
                  Feature on homepage carousel
                </Label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Featured image</Label>
                {createDialog.imageUrl ? (
                  <div className="relative overflow-hidden rounded-md border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={createDialog.imageUrl}
                      alt="Featured"
                      className="h-28 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setCreateDialog((s) => ({ ...s, imageUrl: "" }))}
                      className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setCreateMediaOpen(true)}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Pick from media library
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setCreateDialog(EMPTY_CREATE); setProductResults([]); }}
            >
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media picker for create dialog */}
      <MediaPickerDialog
        open={createMediaOpen}
        onOpenChange={setCreateMediaOpen}
        selectedUrls={createDialog.imageUrl ? [createDialog.imageUrl] : []}
        maxPick={1}
        title="Pick a featured image"
        confirmLabel="Use image"
        onConfirm={(urls) => setCreateDialog((s) => ({ ...s, imageUrl: urls[0] ?? "" }))}
      />

      {/* Media picker for feature dialog */}
      <MediaPickerDialog
        open={featureMediaOpen}
        onOpenChange={setFeatureMediaOpen}
        selectedUrls={featureDialog.imageUrl ? [featureDialog.imageUrl] : []}
        maxPick={1}
        title="Pick a featured image"
        confirmLabel="Use image"
        onConfirm={(urls) => setFeatureDialog((s) => ({ ...s, imageUrl: urls[0] ?? "" }))}
      />
    </div>
  );
}
