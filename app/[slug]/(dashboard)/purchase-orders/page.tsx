"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
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
  XCircle,
  PackageCheck,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useTenantFetch } from "@/hooks/useTenantFetch";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Supplier {
  _id: string;
  name: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  retailPrice: number;
}

interface POItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
}

interface PurchaseOrder {
  _id: string;
  poNumber: string;
  status: "draft" | "submitted" | "approved" | "received" | "cancelled";
  supplierName?: string;
  supplierId?: { name: string } | null;
  branchId: { name: string };
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
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const apiFetch = useTenantFetch();
  const { slug } = useParams<{ slug: string }>();
  const branchId = session?.user?.branchIds?.[0] ?? "";

  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  // Create PO form state
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [poNotes, setPONotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [poItems, setPOItems] = useState<POItem[]>([
    { productId: "", productName: "", sku: "", quantity: 1, unitCost: 0 },
  ]);

  const { data: result, isLoading } = useQuery({
    queryKey: ["purchase-orders", branchId, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await apiFetch(`/api/purchase-orders?${params}`);
      return res.json();
    },
  });

  const { data: suppliersResult } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await apiFetch("/api/suppliers");
      return res.json();
    },
  });

  const { data: productsResult } = useQuery({
    queryKey: ["products-list"],
    queryFn: async () => {
      const res = await apiFetch("/api/products?limit=200");
      return res.json();
    },
    enabled: createOpen,
  });

  const orders: PurchaseOrder[] = result?.data ?? [];
  const total = result?.meta?.total ?? 0;
  const suppliers: Supplier[] = suppliersResult?.data ?? [];
  const products: Product[] = productsResult?.data ?? [];

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiFetch(`/api/purchase-orders/${id}`, {
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
      const supplier = suppliers.find((s) => s._id === selectedSupplierId);
      const res = await apiFetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          supplierId: selectedSupplierId || undefined,
          supplierName: supplier?.name,
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
    setSelectedSupplierId("");
    setPONotes("");
    setExpectedDate("");
    setPOItems([{ productId: "", productName: "", sku: "", quantity: 1, unitCost: 0 }]);
  }

  function setItemProduct(index: number, productId: string) {
    const product = products.find((p) => p._id === productId);
    if (!product) return;
    setPOItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              productId,
              productName: product.name,
              sku: product.sku,
              unitCost: product.retailPrice,
            }
          : item
      )
    );
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
      key: "supplier",
      label: "Supplier",
      render: (o: PurchaseOrder) => (
        <span className="text-sm">
          {o.supplierId?.name ?? o.supplierName ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
    },
    {
      key: "branch",
      label: "Branch",
      render: (o: PurchaseOrder) => (
        <span className="text-sm">{o.branchId?.name}</span>
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
        <Link href={`/${slug}/purchase-orders/${o._id}`}>
          <Button variant="ghost" size="icon">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <Header title="Purchase Orders" subtitle="Manage supplier purchase orders and stock receiving" />
      <div className="flex-1 p-6 space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New PO
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Draft" value={draftCount} icon={ClipboardCheck} description="Pending submission" iconClassName="bg-gray-100" />
          <StatCard title="Submitted" value={submittedCount} icon={Clock} description="Awaiting approval" iconClassName="bg-yellow-100" />
          <StatCard title="Approved" value={approvedCount} icon={CheckCircle} description="Ready to receive" iconClassName="bg-blue-100" />
          <StatCard title="Received" value={receivedCount} icon={PackageCheck} description="Stock updated" iconClassName="bg-green-100" />
        </div>

        <Tabs
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
        >
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
      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              New Purchase Order
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Supplier</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
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
                      <div>
                        <Label className="text-xs">Product</Label>
                        <Select
                          value={item.productId}
                          onValueChange={(v) => setItemProduct(index, v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p._id} value={p._id}>
                                {p.name} ({p.sku})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <Label className="text-xs">Qty</Label>
                          <Input
                            type="number"
                            min={1}
                            className="h-8 text-sm"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, "quantity", parseInt(e.target.value) || 1)
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Unit Cost</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="h-8 text-sm"
                            value={item.unitCost}
                            onChange={(e) =>
                              updateItem(index, "unitCost", parseFloat(e.target.value) || 0)
                            }
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
                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              disabled={createMutation.isPending || poItems.every((i) => !i.productId)}
            >
              {createMutation.isPending ? "Creating..." : "Create Purchase Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
