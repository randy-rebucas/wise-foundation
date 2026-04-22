"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/StatCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingBag,
  Plus,
  Eye,
  Trash2,
  ClipboardCheck,
  Clock,
  CheckCircle,
  PackageCheck,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";

type OrganizationType = "distributor" | "franchise" | "partner";

interface Organization {
  _id: string;
  name: string;
  type: OrganizationType;
}

interface ProductHit {
  _id: string;
  name: string;
  sku: string;
  retailPrice: number;
  cost: number;
}

interface POItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

interface PurchaseOrder {
  _id: string;
  poNumber: string;
  status: "draft" | "submitted" | "approved" | "received" | "cancelled";
  organizationId?: { name: string; type: OrganizationType } | null;
  subtotal: number;
  total: number;
  createdBy: { name: string };
  createdAt: string;
  expectedDeliveryDate?: string;
}

const STATUS_BADGE: Record<string, "default" | "success" | "secondary" | "destructive" | "warning"> = {
  draft: "secondary",
  submitted: "warning",
  approved: "default",
  received: "success",
  cancelled: "destructive",
};

const STATUS_NEXT: Record<string, { label: string; value: string } | null> = {
  draft: { label: "Submit", value: "submitted" },
  submitted: { label: "Approve", value: "approved" },
  approved: null,
  received: null,
  cancelled: null,
};

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [poNotes, setPONotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [poItems, setPOItems] = useState<POItem[]>([
    { productId: "", productName: "", sku: "", quantity: 1, unitCost: 0 },
  ]);
  const [poSuggestRow, setPoSuggestRow] = useState<number | null>(null);

  const poSuggestQuery =
    poSuggestRow !== null ? (poItems[poSuggestRow]?.productName ?? "").trim() : "";
  const debouncedPOSuggestQuery = useDebouncedValue(poSuggestQuery, 280);

  const { data: poProductHits = [], isFetching: poProductsLoading } = useQuery({
    queryKey: ["purchase-order-product-search", debouncedPOSuggestQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "30",
        search: debouncedPOSuggestQuery,
        isActive: "true",
      });
      const res = await fetch(`/api/products?${params}`);
      const j = await res.json();
      if (!j.success) return [];
      return (j.data ?? []) as ProductHit[];
    },
    enabled: createOpen && debouncedPOSuggestQuery.length >= 2,
  });

  const { data: result, isLoading } = useQuery({
    queryKey: ["purchase-orders", statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/purchase-orders?${params}`);
      return res.json();
    },
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await fetch("/api/organizations");
      const json = await res.json();
      const raw = json?.data;
      return Array.isArray(raw) ? raw : [];
    },
  });

  const orders: PurchaseOrder[] = result?.data ?? [];
  const total = result?.meta?.total ?? 0;

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedOrgId,
          items: poItems.filter((i) => i.productId),
          expectedDeliveryDate: expectedDate || undefined,
          notes: poNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setCreateOpen(false);
      resetForm();
    },
  });

  function resetForm() {
    setSelectedOrgId("");
    setPONotes("");
    setExpectedDate("");
    setPoSuggestRow(null);
    setPOItems([{ productId: "", productName: "", sku: "", quantity: 1, unitCost: 0 }]);
  }

  function patchPOItem(index: number, patch: Partial<POItem>) {
    setPOItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function selectPOProduct(index: number, p: ProductHit) {
    const unitCost = p.cost > 0 ? p.cost : p.retailPrice;
    patchPOItem(index, {
      productId: p._id,
      productName: p.name,
      sku: p.sku,
      unitCost,
    });
    setPoSuggestRow(null);
  }

  function updateItem(index: number, field: keyof POItem, value: string | number) {
    setPOItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    setPOItems((prev) => [
      ...prev,
      { productId: "", productName: "", sku: "", quantity: 1, unitCost: 0 },
    ]);
  }

  function removeItem(index: number) {
    setPOItems((prev) => prev.filter((_, i) => i !== index));
  }

  const itemsTotal = poItems.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

  const draftCount = orders.filter((o) => o.status === "draft").length;
  const submittedCount = orders.filter((o) => o.status === "submitted").length;
  const approvedCount = orders.filter((o) => o.status === "approved").length;
  const receivedCount = orders.filter((o) => o.status === "received").length;

  const columns = [
    {
      key: "poNumber",
      label: "PO #",
      render: (o: PurchaseOrder) => (
        <div>
          <p className="font-mono font-medium text-sm">{o.poNumber}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "organization",
      label: "Organization",
      render: (o: PurchaseOrder) =>
        o.organizationId ? (
          <div>
            <p className="text-sm font-medium">{o.organizationId.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{o.organizationId.type}</p>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      key: "total",
      label: "Total",
      render: (o: PurchaseOrder) => (
        <span className="font-semibold">{formatCurrency(o.total)}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (o: PurchaseOrder) => {
        const next = STATUS_NEXT[o.status];
        return (
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_BADGE[o.status] ?? "secondary"}>{o.status}</Badge>
            {next && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() => statusMutation.mutate({ id: o._id, status: next.value })}
                disabled={statusMutation.isPending}
              >
                {next.label}
              </Button>
            )}
            {(o.status === "draft" || o.status === "submitted") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-destructive"
                onClick={() => statusMutation.mutate({ id: o._id, status: "cancelled" })}
                disabled={statusMutation.isPending}
              >
                Cancel
              </Button>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "",
      render: (o: PurchaseOrder) => (
        <Link href={`/purchase-orders/${o._id}`}>
          <Button variant="ghost" size="icon">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <Header title="Purchase Orders" subtitle="Manage orders from distributors, franchises, and partners" />
      <div className="flex-1 p-6 space-y-6">
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setPoSuggestRow(null);
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New PO
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Draft" value={draftCount} icon={ClipboardCheck} description="Pending submission" iconClassName="bg-gray-100" />
          <StatCard title="Submitted" value={submittedCount} icon={Clock} description="Awaiting approval" iconClassName="bg-yellow-100" />
          <StatCard title="Approved" value={approvedCount} icon={CheckCircle} description="Ready to fulfill" iconClassName="bg-blue-100" />
          <StatCard title="Received" value={receivedCount} icon={PackageCheck} description="Fulfilled" iconClassName="bg-green-100" />
        </div>

        <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="submitted">Submitted</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="received">Received</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        <DataTable
          columns={columns}
          data={orders}
          loading={isLoading}
          keyExtractor={(o) => o._id}
          emptyMessage="No purchase orders found."
          page={page}
          totalPages={Math.ceil(total / 20)}
          onPageChange={setPage}
        />
      </div>

      {/* Create PO Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(v) => {
          setCreateOpen(v);
          if (!v) {
            setPoSuggestRow(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl overflow-y-visible sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              New Purchase Order
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[min(70vh,32rem)] space-y-4 overflow-y-auto pr-1 sm:max-h-[min(75vh,40rem)]">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Organization</Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org._id} value={org._id}>
                        {org.name}
                        <span className="text-muted-foreground capitalize ml-1">({org.type})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Expected Delivery</Label>
                <Input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="border rounded-lg divide-y">
                {poItems.map((item, index) => (
                  <div key={index} className="p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Label className="text-xs">Product</Label>
                        <Input
                          className="h-8 text-sm"
                          placeholder="Type to search catalog…"
                          value={item.productName}
                          autoComplete="off"
                          onFocus={() => setPoSuggestRow(index)}
                          onChange={(e) => {
                            updateItem(index, "productName", e.target.value);
                            setPoSuggestRow(index);
                            if (e.target.value.trim() === "") {
                              patchPOItem(index, { productId: "" });
                            }
                          }}
                          onBlur={() => {
                            window.setTimeout(() => {
                              setPoSuggestRow((cur) => (cur === index ? null : cur));
                            }, 180);
                          }}
                        />
                        {poSuggestRow === index && poSuggestQuery.length >= 2 && (
                          <div
                            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md"
                            role="listbox"
                          >
                            {poProductsLoading ? (
                              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Searching…
                              </div>
                            ) : poProductHits.length === 0 ? (
                              <p className="px-3 py-3 text-sm text-muted-foreground">No matching products.</p>
                            ) : (
                              poProductHits.map((p) => (
                                <button
                                  key={p._id}
                                  type="button"
                                  role="option"
                                  className="flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => selectPOProduct(index, p)}
                                >
                                  <span className="font-medium">{p.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {p.sku} · {formatCurrency(p.cost > 0 ? p.cost : p.retailPrice)}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <Label className="text-xs">Qty</Label>
                          <Input
                            type="number"
                            min={1}
                            className="h-8 text-sm"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Unit cost</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="h-8 text-sm"
                            value={item.unitCost}
                            onChange={(e) => updateItem(index, "unitCost", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Subtotal: {formatCurrency(item.quantity * item.unitCost)}
                      </span>
                      {poItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end text-sm font-semibold">
                Total: {formatCurrency(itemsTotal)}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <textarea
                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                value={poNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPONotes(e.target.value)}
                placeholder="Optional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !selectedOrgId || poItems.every((i) => !i.productId)}
            >
              {createMutation.isPending ? "Creating..." : "Create Purchase Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
