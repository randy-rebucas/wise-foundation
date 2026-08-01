"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, TicketPercent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/providers/confirm-provider";

const PAGE_SIZE = 10;

type CouponType = "percent" | "fixed" | "free_shipping" | "free_item";

interface Promo {
  _id: string;
  code: string;
  type: CouponType;
  value: number;
  source: "welcome" | "birthday" | "manual" | "spin";
  spinPrizeLabel?: string;
  freeItemProductId?: string | null;
  maxRedemptions: number;
  redemptions: { redeemedAt: string }[];
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
}

interface FormState {
  code: string;
  type: CouponType;
  value: string;
  freeItemProductId: string;
  maxRedemptions: string;
  isActive: boolean;
  expiresAt: string;
}

const EMPTY_FORM: FormState = {
  code: "",
  type: "percent",
  value: "",
  freeItemProductId: "",
  maxRedemptions: "1",
  isActive: true,
  expiresAt: "",
};

function formatValue(p: Promo): string {
  if (p.type === "percent") return `${p.value}% off`;
  if (p.type === "fixed") return `₱${p.value} off`;
  if (p.type === "free_shipping") return "Free shipping";
  return p.spinPrizeLabel ?? "Free item";
}

function isExpired(p: Promo): boolean {
  return !!p.expiresAt && new Date(p.expiresAt) < new Date();
}

export default function PromosAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Promo | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: listResult,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["promos", page],
    queryFn: async () => {
      const res = await fetch(`/api/promos?page=${page}&limit=${PAGE_SIZE}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load promos (${res.status})`);
      return json as { data: Promo[]; meta?: { total?: number } };
    },
  });

  const promos = listResult?.data ?? [];
  const total = listResult?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        code: form.code,
        type: form.type,
        value: form.type === "free_shipping" ? 0 : Number(form.value),
        maxRedemptions: Number(form.maxRedemptions) || 1,
        isActive: form.isActive,
      };
      if (form.type === "free_item") payload.freeItemProductId = form.freeItemProductId;
      if (form.expiresAt) payload.expiresAt = new Date(form.expiresAt).toISOString();

      const url = editing ? `/api/promos/${editing._id}` : "/api/promos";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Save failed (${res.status})`);
      return data.data as Promo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promos"] });
      toast({ title: editing ? "Promo updated" : "Promo created" });
      setDialogOpen(false);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/promos/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Delete failed (${res.status})`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promos"] });
      toast({ title: "Promo deleted" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  function openCreateDialog() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(p: Promo) {
    setEditing(p);
    setForm({
      code: p.code,
      type: p.type,
      value: String(p.value ?? ""),
      freeItemProductId: p.freeItemProductId ?? "",
      maxRedemptions: String(p.maxRedemptions ?? 1),
      isActive: p.isActive,
      expiresAt: p.expiresAt ? p.expiresAt.slice(0, 10) : "",
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    saveMutation.mutate();
  }

  const columns = [
    {
      key: "code",
      label: "Code",
      render: (p: Promo) => <span className="font-mono text-sm font-medium">{p.code}</span>,
    },
    {
      key: "value",
      label: "Discount",
      render: (p: Promo) => <span>{formatValue(p)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (p: Promo) => (
        <div className="flex gap-1">
          <Badge variant={p.isActive ? "success" : "secondary"}>
            {p.isActive ? "Active" : "Inactive"}
          </Badge>
          {isExpired(p) && <Badge variant="destructive">Expired</Badge>}
        </div>
      ),
    },
    {
      key: "redemptions",
      label: "Redeemed",
      render: (p: Promo) => (
        <span className="text-sm text-muted-foreground">
          {p.redemptions.length} / {p.maxRedemptions}
        </span>
      ),
    },
    {
      key: "expiresAt",
      label: "Expires",
      render: (p: Promo) => (
        <span className="text-xs text-muted-foreground">
          {p.expiresAt ? p.expiresAt.slice(0, 10) : "Never"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (p: Promo) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" title="Edit promo" onClick={() => openEditDialog(p)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            title="Delete promo"
            onClick={async () => {
              const ok = await confirm({
                title: `Delete "${p.code}"?`,
                description: "This permanently removes the promo code. This cannot be undone.",
                variant: "destructive",
              });
              if (ok) deleteMutation.mutate(p._id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <RoleGuard allowedRoles={["ADMIN"]} requiredPermissions={["manage:promotions"]}>
      <div className="flex flex-col">
        <Header title="Promos" subtitle="Create and manage promo codes for the storefront" />
        <div className="flex-1 space-y-4 p-4 sm:p-6">
          <div className="flex justify-end">
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              New promo
            </Button>
          </div>

          {isError && (
            <ErrorState error={error} fallback="Unable to load promos." onRetry={() => refetch()} />
          )}

          <DataTable
            columns={columns}
            data={promos}
            loading={isLoading}
            keyExtractor={(p) => p._id}
            emptyMessage="No promo codes yet."
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TicketPercent className="h-5 w-5" />
              {editing ? "Edit promo" : "New promo"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. SAVE20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v: CouponType) => setForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent off</SelectItem>
                  <SelectItem value="fixed">Fixed amount off</SelectItem>
                  <SelectItem value="free_shipping">Free shipping</SelectItem>
                  <SelectItem value="free_item">Free item</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.type !== "free_shipping" && (
              <div className="space-y-2">
                <Label htmlFor="value">
                  {form.type === "percent" ? "Percent (0-100)" : "Amount"}
                </Label>
                <Input
                  id="value"
                  type="number"
                  min={0}
                  max={form.type === "percent" ? 100 : undefined}
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  required
                />
              </div>
            )}

            {form.type === "free_item" && (
              <div className="space-y-2">
                <Label htmlFor="freeItemProductId">Product ID</Label>
                <Input
                  id="freeItemProductId"
                  value={form.freeItemProductId}
                  onChange={(e) => setForm((f) => ({ ...f, freeItemProductId: e.target.value }))}
                  placeholder="Product _id"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="maxRedemptions">Max redemptions</Label>
              <Input
                id="maxRedemptions"
                type="number"
                min={1}
                value={form.maxRedemptions}
                onChange={(e) => setForm((f) => ({ ...f, maxRedemptions: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires (optional)</Label>
              <Input
                id="expiresAt"
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked === true }))}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Create promo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </RoleGuard>
  );
}
