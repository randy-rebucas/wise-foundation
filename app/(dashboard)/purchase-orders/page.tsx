"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  Pencil,
  Trash2,
  ClipboardCheck,
  Clock,
  CheckCircle,
  PackageCheck,
  Loader2,
} from "lucide-react";
import { useFormatCurrency, useFormatDateTime } from "@/components/providers/TenantProvider";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

type OrganizationType = "distributor" | "franchise" | "partner" | "headquarters";

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
  variantCount?: number | null;
}

interface ProductVariantOption {
  _id: string;
  name: string;
  sku: string;
  retailPrice: number;
  isActive?: boolean;
}

interface POItem {
  productId: string;
  productName: string;
  baseProductName?: string;
  sku: string;
  variantId?: string;
  variants?: ProductVariantOption[];
  variantsLoading?: boolean;
  quantity: number;
  unitCost: number;
}

const defaultPOItem: POItem = {
  productId: "",
  productName: "",
  sku: "",
  quantity: 1,
  unitCost: 0,
};

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
  const money = useFormatCurrency();
  const dateTime = useFormatDateTime();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPoId, setEditingPoId] = useState<string | null>(null);
  const [editingPoNumber, setEditingPoNumber] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [poNotes, setPONotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [poItems, setPOItems] = useState<POItem[]>([{ ...defaultPOItem }]);
  const [poSuggestRow, setPoSuggestRow] = useState<number | null>(null);

  const poSuggestQuery =
    poSuggestRow !== null ? (poItems[poSuggestRow]?.productName ?? "").trim() : "";
  const debouncedPOSuggestQuery = useDebouncedValue(poSuggestQuery, 280);

  const {
    data: poProductHits = [],
    isFetching: poProductsLoading,
    isError: isProductSearchError,
    error: productSearchError,
  } = useQuery({
    queryKey: ["purchase-order-product-search", debouncedPOSuggestQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "30",
        search: debouncedPOSuggestQuery,
        isActive: "true",
        includeVariantSummary: "true",
      });
      const res = await fetch(`/api/products?${params}`);
      const j = await res.json();
      if (!j.success) throw new Error(j.error ?? `Product search failed (${res.status})`);
      const raw = j.data;
      return Array.isArray(raw) ? (raw as ProductHit[]) : [];
    },
    enabled: formOpen && debouncedPOSuggestQuery.length >= 2,
  });

  const {
    data: listResult,
    isLoading,
    isError: isListError,
    error: listError,
  } = useQuery({
    queryKey: ["purchase-orders", statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/purchase-orders?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load purchase orders (${res.status})`);
      return json as { data: PurchaseOrder[]; meta?: { total: number } };
    },
  });

  const {
    data: organizations = [],
    isError: isOrgsError,
    error: orgsError,
  } = useQuery({
    queryKey: ["organizations-for-purchase-orders"],
    queryFn: async () => {
      const res = await fetch("/api/organizations/for-purchase-orders");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load organizations (${res.status})`);
      return (json.data ?? []) as Organization[];
    },
  });

  const orders: PurchaseOrder[] = listResult?.data ?? [];
  const total = listResult?.meta?.total ?? 0;

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Update failed (${res.status})`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }),
    onError: (err: Error) => toast({ variant: "destructive", title: "Status update failed", description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/purchase-orders/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Delete failed (${res.status})`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: "Purchase order deleted" });
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Delete failed", description: err.message }),
  });

  function confirmDeletePurchaseOrder(po: PurchaseOrder) {
    if (
      !window.confirm(
        `Delete purchase order ${po.poNumber}? This cannot be undone.`
      )
    ) {
      return;
    }
    deleteMutation.mutate(po._id);
  }

  function buildItemsPayload() {
    return poItems
      .filter((i) => i.productId && (!i.variants?.length || i.variantId))
      .map(({ productId, variantId, productName, sku, quantity, unitCost }) => ({
        productId,
        variantId: variantId || undefined,
        productName,
        sku,
        quantity,
        unitCost,
      }));
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const items = buildItemsPayload();
      if (editingPoId) {
        const res = await fetch(`/api/purchase-orders/${editingPoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items,
            expectedDeliveryDate: expectedDate || undefined,
            notes: poNotes || undefined,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error ?? `Update failed (${res.status})`);
        return data;
      }
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedOrgId,
          items,
          expectedDeliveryDate: expectedDate || undefined,
          notes: poNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Create failed (${res.status})`);
      return data;
    },
    onSuccess: () => {
      const wasEdit = !!editingPoId;
      const editedId = editingPoId;
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      if (editedId) {
        queryClient.invalidateQueries({ queryKey: ["purchase-order", editedId] });
      }
      closeForm();
      toast({
        title: wasEdit ? "Purchase order updated" : "Purchase order created",
      });
    },
    onError: (err: Error) =>
      toast({
        variant: "destructive",
        title: editingPoId ? "Could not update PO" : "Could not create PO",
        description: err.message,
      }),
  });

  function resetForm() {
    setSelectedOrgId("");
    setPONotes("");
    setExpectedDate("");
    setPoSuggestRow(null);
    setPOItems([{ ...defaultPOItem }]);
    setEditingPoId(null);
    setEditingPoNumber("");
  }

  function closeForm() {
    setFormOpen(false);
    resetForm();
  }

  function toDateInputValue(iso?: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  }

  async function openCreate() {
    resetForm();
    setPoSuggestRow(null);
    setFormOpen(true);
  }

  const openEdit = useCallback(async (poId: string) => {
    setFormLoading(true);
    setPoSuggestRow(null);
    setEditingPoId(poId);
    setFormOpen(true);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load purchase order (${res.status})`);
      const po = json.data as {
        poNumber: string;
        status: string;
        organizationId?: { _id: string } | string;
        expectedDeliveryDate?: string;
        notes?: string;
        items: {
          productId?: { _id: string } | string;
          variantId?: { _id: string } | string | null;
          productName: string;
          sku: string;
          quantity: number;
          unitCost: number;
        }[];
      };

      if (po.status !== "draft") {
        throw new Error("Only draft purchase orders can be edited");
      }

      setEditingPoNumber(po.poNumber);
      const orgId =
        po.organizationId && typeof po.organizationId === "object"
          ? po.organizationId._id
          : po.organizationId;
      setSelectedOrgId(orgId ? String(orgId) : "");
      setExpectedDate(toDateInputValue(po.expectedDeliveryDate));
      setPONotes(po.notes ?? "");

      const loadedItems: POItem[] = [];
      for (const item of po.items ?? []) {
        const productId = String(
          item.productId && typeof item.productId === "object"
            ? item.productId._id
            : item.productId ?? ""
        );
        let variants: ProductVariantOption[] | undefined;
        if (productId) {
          const vRes = await fetch(`/api/products/${productId}/variants`);
          const vJson = await vRes.json();
          if (vJson.success) {
            const active = ((vJson.data ?? []) as ProductVariantOption[]).filter(
              (v) => v.isActive !== false
            );
            if (active.length > 0) variants = active;
          }
        }
        const variantIdRaw = item.variantId;
        const variantId =
          variantIdRaw && typeof variantIdRaw === "object"
            ? String(variantIdRaw._id)
            : variantIdRaw
              ? String(variantIdRaw)
              : undefined;
        const productName = item.productName ?? "";
        const sep = " — ";
        const baseProductName = productName.includes(sep)
          ? productName.split(sep)[0]!
          : productName;
        loadedItems.push({
          productId,
          productName,
          baseProductName,
          sku: item.sku,
          variantId,
          variants,
          quantity: item.quantity,
          unitCost: item.unitCost,
        });
      }
      setPOItems(loadedItems.length > 0 ? loadedItems : [{ ...defaultPOItem }]);
    } catch (err) {
      closeForm();
      toast({
        variant: "destructive",
        title: "Could not open purchase order",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setFormLoading(false);
    }
  }, [toast]);

  const editFromUrlHandled = useRef(false);
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || editFromUrlHandled.current) return;
    editFromUrlHandled.current = true;
    void openEdit(editId);
    router.replace("/purchase-orders");
  }, [searchParams, openEdit, router]);

  const poItemsReady = poItems.every((i) => {
    if (!i.productId) return true;
    if (i.variantsLoading) return false;
    if (i.variants && i.variants.length > 0) return !!i.variantId;
    return true;
  });

  function patchPOItem(index: number, patch: Partial<POItem>) {
    setPOItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  async function selectPOProduct(index: number, p: ProductHit) {
    patchPOItem(index, {
      productId: p._id,
      productName: p.name,
      baseProductName: p.name,
      sku: p.sku,
      unitCost: p.retailPrice,
      variantId: undefined,
      variants: undefined,
      variantsLoading: true,
    });
    setPoSuggestRow(null);

    try {
      const res = await fetch(`/api/products/${p._id}/variants`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load variants");
      const all = (json.data ?? []) as ProductVariantOption[];
      const active = all.filter((v) => v.isActive !== false);

      if (active.length > 0) {
        patchPOItem(index, {
          variants: active,
          variantsLoading: false,
          variantId: undefined,
          sku: "",
          unitCost: 0,
        });
      } else {
        patchPOItem(index, {
          variants: [],
          variantsLoading: false,
        });
      }
    } catch {
      patchPOItem(index, { variants: [], variantsLoading: false });
    }
  }

  function selectPOVariant(index: number, variantId: string) {
    const item = poItems[index];
    const variant = item?.variants?.find((v) => v._id === variantId);
    if (!item || !variant) return;
    const baseName = item.baseProductName ?? item.productName;
    patchPOItem(index, {
      variantId: variant._id,
      productName: `${baseName} — ${variant.name}`,
      sku: variant.sku,
      unitCost: variant.retailPrice,
    });
  }

  function updateItem(index: number, field: keyof POItem, value: string | number) {
    setPOItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    setPOItems((prev) => [...prev, { ...defaultPOItem }]);
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
          <p className="text-xs text-muted-foreground">{dateTime(o.createdAt)}</p>
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
        <span className="font-semibold">{money(o.total)}</span>
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
        <div className="flex justify-end gap-1">
          {o.status === "draft" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                title="Edit purchase order"
                aria-label="Edit purchase order"
                onClick={() => openEdit(o._id)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                title="Delete purchase order"
                aria-label="Delete purchase order"
                disabled={deleteMutation.isPending}
                onClick={() => confirmDeletePurchaseOrder(o)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          <Link href={`/purchase-orders/${o._id}`}>
            <Button variant="ghost" size="icon" title="View purchase order" aria-label="View purchase order">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <Header title="Purchase Orders" subtitle="Manage orders from distributors, franchises, and partners" />
      <div className="flex-1 p-6 space-y-6">
        {isListError && (
          <Alert variant="destructive">
            <AlertDescription>
              {listError instanceof Error ? listError.message : "Unable to load purchase orders."}
            </AlertDescription>
          </Alert>
        )}
        <div className="flex justify-end">
          <Button onClick={() => void openCreate()}>
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

      {/* Create / Edit PO Dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(v) => {
          if (!v) closeForm();
        }}
      >
        <DialogContent className="max-w-2xl overflow-y-visible sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              {editingPoId ? `Edit ${editingPoNumber || "Purchase Order"}` : "New Purchase Order"}
            </DialogTitle>
          </DialogHeader>

          {formLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
          <div className="space-y-4 pr-1">
            {isOrgsError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {orgsError instanceof Error ? orgsError.message : "Unable to load organizations."}
                </AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Organization</Label>
                <Select
                  value={selectedOrgId}
                  onValueChange={setSelectedOrgId}
                  disabled={!!editingPoId}
                >
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
                              patchPOItem(index, {
                                productId: "",
                                variantId: undefined,
                                variants: undefined,
                                variantsLoading: false,
                                sku: "",
                                unitCost: 0,
                              });
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
                            ) : isProductSearchError ? (
                              <p className="px-3 py-3 text-sm text-destructive">
                                {productSearchError instanceof Error
                                  ? productSearchError.message
                                  : "Product search failed."}
                              </p>
                            ) : poProductHits.length === 0 ? (
                              <p className="px-3 py-3 text-sm text-muted-foreground">No matching products.</p>
                            ) : (
                              poProductHits.map((p) => (
                                <button
                                  key={p._id}
                                  type="button"
                                  role="option"
                                  aria-selected={item.productId === p._id}
                                  className="flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => selectPOProduct(index, p)}
                                >
                                  <span className="font-medium">{p.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {p.sku} · {money(p.retailPrice)}
                                    {typeof p.variantCount === "number" && p.variantCount > 0 && (
                                      <> · {p.variantCount} variant{p.variantCount === 1 ? "" : "s"}</>
                                    )}
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
                    {item.variantsLoading && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading variants…
                      </div>
                    )}
                    {item.variants && item.variants.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs">Variant *</Label>
                        <Select
                          value={item.variantId ?? ""}
                          onValueChange={(vId) => selectPOVariant(index, vId)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select variant" />
                          </SelectTrigger>
                          <SelectContent>
                            {item.variants.map((v) => (
                              <SelectItem key={v._id} value={v._id}>
                                {v.name} ({v.sku}) · {money(v.retailPrice)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Subtotal: {money(item.quantity * item.unitCost)}
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
                Total: {money(itemsTotal)}
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
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeForm} disabled={formLoading || saveMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={
                formLoading ||
                saveMutation.isPending ||
                (!editingPoId && !selectedOrgId) ||
                poItems.every((i) => !i.productId) ||
                !poItemsReady
              }
            >
              {saveMutation.isPending
                ? editingPoId
                  ? "Saving..."
                  : "Creating..."
                : editingPoId
                  ? "Save Changes"
                  : "Create Purchase Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
