"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { FileDropzone } from "@/components/shared/FileDropzone";
import { useConfirm } from "@/components/providers/confirm-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Search, Megaphone } from "lucide-react";

const PAGE_SIZE = 10;

interface AdRow {
  _id: string;
  productId: { _id: string; name: string; slug: string; images?: string[] } | null;
  creativeType: "image" | "video";
  creativeUrl: string;
  posterUrl?: string;
  headline?: string;
  caption?: string;
  isActive: boolean;
  sortOrder: number;
  startsAt?: string | null;
  endsAt?: string | null;
  impressions: number;
  clicks: number;
}

interface FormState {
  open: boolean;
  editingId: string | null;
  productId: string;
  productName: string;
  productSearch: string;
  creativeType: "image" | "video";
  creativeUrl: string;
  posterUrl: string;
  headline: string;
  caption: string;
  isActive: boolean;
  sortOrder: string;
  startsAt: string;
  endsAt: string;
}

const EMPTY_FORM: FormState = {
  open: false,
  editingId: null,
  productId: "",
  productName: "",
  productSearch: "",
  creativeType: "image",
  creativeUrl: "",
  posterUrl: "",
  headline: "",
  caption: "",
  isActive: true,
  sortOrder: "0",
  startsAt: "",
  endsAt: "",
};

export default function AdsAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [page, setPage] = useState(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [productResults, setProductResults] = useState<
    { _id: string; name: string; slug: string }[]
  >([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);

  const {
    data: listResult,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-ads", page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/ads?page=${page}&limit=${PAGE_SIZE}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load ads (${res.status})`);
      return json as { data: AdRow[]; meta?: { total?: number } };
    },
  });

  const ads = listResult?.data ?? [];
  const total = listResult?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function searchProducts(q: string) {
    if (!q.trim()) {
      setProductResults([]);
      return;
    }
    setProductSearchLoading(true);
    try {
      const res = await fetch(`/api/marketplace/products?search=${encodeURIComponent(q)}&limit=8`);
      const json = await res.json();
      setProductResults(json.data ?? []);
    } finally {
      setProductSearchLoading(false);
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.productId) throw new Error("Select a product");
      if (!form.creativeUrl) throw new Error("Upload a creative image or video");

      const body = {
        productId: form.productId,
        creativeType: form.creativeType,
        creativeUrl: form.creativeUrl,
        posterUrl: form.posterUrl || undefined,
        headline: form.headline || undefined,
        caption: form.caption || undefined,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      };

      const url = form.editingId ? `/api/admin/ads/${form.editingId}` : "/api/admin/ads";
      const res = await fetch(url, {
        method: form.editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Save failed (${res.status})`);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      toast({ title: form.editingId ? "Ad updated" : "Ad created" });
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/ads/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Delete failed (${res.status})`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      toast({ title: "Ad deleted" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  async function handleCreativeSelected(files: File[]) {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("files", file);
      fd.append("creativeType", form.creativeType);
      const res = await fetch("/api/admin/ads/media", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Upload failed (${res.status})`);
      setForm((s) => ({ ...s, creativeUrl: json.data.url }));
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  function openEdit(ad: AdRow) {
    setForm({
      open: true,
      editingId: ad._id,
      productId: ad.productId?._id ?? "",
      productName: ad.productId?.name ?? "",
      productSearch: "",
      creativeType: ad.creativeType,
      creativeUrl: ad.creativeUrl,
      posterUrl: ad.posterUrl ?? "",
      headline: ad.headline ?? "",
      caption: ad.caption ?? "",
      isActive: ad.isActive,
      sortOrder: String(ad.sortOrder),
      startsAt: ad.startsAt ? ad.startsAt.slice(0, 10) : "",
      endsAt: ad.endsAt ? ad.endsAt.slice(0, 10) : "",
    });
  }

  const columns = [
    {
      key: "creative",
      label: "Creative",
      render: (ad: AdRow) => (
        <div className="h-12 w-16 rounded-md bg-muted overflow-hidden border flex-shrink-0">
          {ad.creativeType === "video" ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={ad.creativeUrl} poster={ad.posterUrl} muted className="h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ad.creativeUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
      ),
    },
    {
      key: "product",
      label: "Product",
      render: (ad: AdRow) => (
        <div>
          <p className="font-medium">{ad.productId?.name ?? "—"}</p>
          {ad.headline && <p className="text-xs text-muted-foreground">{ad.headline}</p>}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (ad: AdRow) => (
        <Badge variant={ad.isActive ? "success" : "secondary"}>
          {ad.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "sortOrder",
      label: "Order",
      render: (ad: AdRow) => <span className="text-sm">{ad.sortOrder}</span>,
    },
    {
      key: "schedule",
      label: "Schedule",
      render: (ad: AdRow) => (
        <span className="text-xs text-muted-foreground">
          {ad.startsAt || ad.endsAt
            ? `${ad.startsAt?.slice(0, 10) ?? "…"} – ${ad.endsAt?.slice(0, 10) ?? "…"}`
            : "Always"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (ad: AdRow) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" title="Edit ad" onClick={() => openEdit(ad)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            title="Delete ad"
            onClick={async () => {
              const ok = await confirm({
                title: "Delete this ad?",
                description: "This removes the ad from the marketplace homepage. This cannot be undone.",
                variant: "destructive",
              });
              if (ok) deleteMutation.mutate(ad._id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <RoleGuard allowedRoles={["ADMIN"]} requiredPermissions={["manage:ads"]}>
      <div className="flex flex-col">
        <Header title="Ads" subtitle="Highlight products on the marketplace homepage" />
        <div className="flex-1 space-y-4 p-4 sm:p-6">
          {isError && (
            <ErrorState error={error} fallback="Unable to load ads." onRetry={() => refetch()} />
          )}

          <div className="flex justify-end">
            <Button onClick={() => setForm({ ...EMPTY_FORM, open: true })}>
              <Plus className="h-4 w-4 mr-2" />
              Add Ad
            </Button>
          </div>

          <DataTable
            columns={columns}
            data={ads}
            loading={isLoading}
            keyExtractor={(ad) => ad._id}
            emptyMessage="No ads found."
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>

        <Dialog open={form.open} onOpenChange={(open) => setForm((s) => (open ? s : EMPTY_FORM))}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                {form.editingId ? "Edit Ad" : "New Ad"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Product *</Label>
                {form.productId ? (
                  <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                    <span className="flex-1 font-medium">{form.productName}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs text-muted-foreground"
                      onClick={() => setForm((s) => ({ ...s, productId: "", productName: "", productSearch: "" }))}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="Search product name..."
                        value={form.productSearch}
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm((s) => ({ ...s, productSearch: v }));
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
                              setForm((s) => ({ ...s, productId: p._id, productName: p.name, productSearch: p.name }));
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

              <div className="space-y-1.5">
                <Label>Creative type</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={form.creativeType === "image" ? "default" : "outline"}
                    onClick={() => setForm((s) => ({ ...s, creativeType: "image", creativeUrl: "" }))}
                  >
                    Image
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={form.creativeType === "video" ? "default" : "outline"}
                    onClick={() => setForm((s) => ({ ...s, creativeType: "video", creativeUrl: "" }))}
                  >
                    Video
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Creative {form.creativeType === "video" ? "video" : "image"} *</Label>
                {form.creativeUrl ? (
                  <div className="relative h-32 w-full rounded-md border bg-muted overflow-hidden">
                    {form.creativeType === "video" ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video src={form.creativeUrl} muted controls className="h-full w-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.creativeUrl} alt="" className="h-full w-full object-cover" />
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="absolute right-2 top-2 h-7"
                      onClick={() => setForm((s) => ({ ...s, creativeUrl: "" }))}
                    >
                      Replace
                    </Button>
                  </div>
                ) : (
                  <FileDropzone
                    accept={form.creativeType === "video" ? "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" : "image/*"}
                    disabled={uploading}
                    busy={uploading}
                    onFilesSelected={handleCreativeSelected}
                    idleLabel={uploading ? "Uploading…" : `Drag ${form.creativeType} here or click to browse`}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-sm font-medium">Uploading…</span>
                      </>
                    ) : undefined}
                  </FileDropzone>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ad-headline">Headline</Label>
                  <Input
                    id="ad-headline"
                    value={form.headline}
                    maxLength={120}
                    onChange={(e) => setForm((s) => ({ ...s, headline: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ad-sortOrder">Sort order</Label>
                  <Input
                    id="ad-sortOrder"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((s) => ({ ...s, sortOrder: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ad-caption">Caption</Label>
                <Input
                  id="ad-caption"
                  value={form.caption}
                  maxLength={240}
                  onChange={(e) => setForm((s) => ({ ...s, caption: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ad-startsAt">Starts</Label>
                  <Input
                    id="ad-startsAt"
                    type="date"
                    value={form.startsAt}
                    onChange={(e) => setForm((s) => ({ ...s, startsAt: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ad-endsAt">Ends</Label>
                  <Input
                    id="ad-endsAt"
                    type="date"
                    value={form.endsAt}
                    onChange={(e) => setForm((s) => ({ ...s, endsAt: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="ad-isActive"
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm((s) => ({ ...s, isActive: checked === true }))}
                />
                <Label htmlFor="ad-isActive" className="cursor-pointer">
                  Active
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setForm(EMPTY_FORM)}>
                Cancel
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || uploading}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {form.editingId ? "Save changes" : "Create ad"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
