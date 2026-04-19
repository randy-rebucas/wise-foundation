"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/StatCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList,
  Eye,
  DollarSign,
  ShoppingCart,
  Clock,
  CheckCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { RoleGuard } from "@/components/layout/RoleGuard";

interface Organization {
  _id: string;
  name: string;
  type: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  type: "POS" | "DISTRIBUTOR" | "B2B";
  status: "pending" | "approved" | "paid" | "completed" | "cancelled" | "refunded";
  memberName?: string;
  cashierId: { name: string };
  buyerOrganizationId?: { _id: string; name: string; type: string } | null;
  sellerOrganizationId?: { _id: string; name: string; type: string } | null;
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
}

interface OrderDetail extends Order {
  items: {
    _id: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  amountPaid: number;
  change: number;
  notes?: string;
}

interface B2BItem {
  productId: string;
  productName: string;
  sku: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
}

interface B2BForm {
  sellerOrganizationId: string;
  buyerOrganizationId: string;
  paymentMethod: string;
  discountPercent: number;
  notes: string;
  items: B2BItem[];
}

const defaultB2BForm: B2BForm = {
  sellerOrganizationId: "",
  buyerOrganizationId: "",
  paymentMethod: "credit",
  discountPercent: 0,
  notes: "",
  items: [{ productId: "", productName: "", sku: "", quantity: 1, unitPrice: 0 }],
};

const STATUS_BADGE: Record<string, "default" | "success" | "secondary" | "destructive" | "warning"> = {
  pending: "warning",
  approved: "default",
  paid: "default",
  completed: "success",
  cancelled: "destructive",
  refunded: "secondary",
};

const TYPE_BADGE_CLASS: Record<string, string> = {
  POS: "bg-blue-100 text-blue-800",
  DISTRIBUTOR: "bg-purple-100 text-purple-800",
  B2B: "bg-orange-100 text-orange-800",
};

export default function OrdersPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const branchId = session?.user?.branchIds?.[0] ?? "";
  const userRole = session?.user?.role ?? "";

  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [b2bOpen, setB2bOpen] = useState(false);
  const [b2bForm, setB2bForm] = useState<B2BForm>(defaultB2BForm);
  const [b2bError, setB2bError] = useState("");

  const { data: result, isLoading } = useQuery({
    queryKey: ["orders", branchId, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (branchId) params.set("branchId", branchId);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/orders?${params}`);
      return res.json();
    },
    enabled: !!branchId,
  });

  const { data: orgsData } = useQuery({
    queryKey: ["organizations-list"],
    queryFn: async () => {
      const res = await fetch("/api/organizations?limit=100");
      return res.json();
    },
    enabled: b2bOpen,
  });

  const organizations: Organization[] = orgsData?.data ?? [];

  const orders: Order[] = result?.data ?? [];
  const total = result?.meta?.total ?? 0;
  const pendingCount = result?.meta?.pendingCount ?? 0;
  const approvedCount = result?.meta?.approvedCount ?? 0;

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const b2bMutation = useMutation({
    mutationFn: async (payload: B2BForm) => {
      const res = await fetch("/api/orders/b2b", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setB2bOpen(false);
      setB2bForm(defaultB2BForm);
      setB2bError("");
    },
    onError: (err: Error) => setB2bError(err.message),
  });

  async function openDetail(orderId: string) {
    const res = await fetch(`/api/orders/${orderId}`);
    const data = await res.json();
    if (data.success) {
      setSelectedOrder(data.data);
      setDetailOpen(true);
    }
  }

  function updateB2BItem(idx: number, field: keyof B2BItem, value: string | number) {
    setB2bForm((prev) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  }

  function addB2BItem() {
    setB2bForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: "", productName: "", sku: "", quantity: 1, unitPrice: 0 }],
    }));
  }

  function removeB2BItem(idx: number) {
    setB2bForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  }

  const canManageOrders = ["ADMIN", "ORG_ADMIN", "BRANCH_MANAGER"].includes(userRole);

  const columns = [
    {
      key: "orderNumber",
      label: "Order #",
      render: (o: Order) => (
        <div>
          <p className="font-mono font-medium text-sm">{o.orderNumber}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (o: Order) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE_CLASS[o.type] ?? ""}`}>
          {o.type}
        </span>
      ),
    },
    {
      key: "customer",
      label: "Customer / Org",
      render: (o: Order) => (
        <div className="text-sm">
          {o.type === "B2B" ? (
            <div>
              <p className="font-medium">{o.buyerOrganizationId?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">from {o.sellerOrganizationId?.name ?? "—"}</p>
            </div>
          ) : (
            <span>{o.memberName ?? <span className="text-muted-foreground">Walk-in</span>}</span>
          )}
        </div>
      ),
    },
    {
      key: "total",
      label: "Amount",
      render: (o: Order) => (
        <div>
          <p className="font-semibold">{formatCurrency(o.total)}</p>
          {o.discountAmount > 0 && (
            <p className="text-xs text-green-600">-{formatCurrency(o.discountAmount)}</p>
          )}
        </div>
      ),
    },
    {
      key: "payment",
      label: "Payment",
      render: (o: Order) => (
        <span className="text-sm capitalize">{o.paymentMethod.replace("_", " ")}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (o: Order) => (
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_BADGE[o.status] ?? "secondary"}>{o.status}</Badge>
          {canManageOrders && (
            <>
              {o.status === "pending" && (
                <Select onValueChange={(v) => statusMutation.mutate({ id: o._id, status: v })}>
                  <SelectTrigger className="h-6 w-28 text-xs">
                    <SelectValue placeholder="Update" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approve</SelectItem>
                    <SelectItem value="cancelled">Cancel</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {o.status === "approved" && (
                <Select onValueChange={(v) => statusMutation.mutate({ id: o._id, status: v })}>
                  <SelectTrigger className="h-6 w-24 text-xs">
                    <SelectValue placeholder="Update" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Mark Paid</SelectItem>
                    <SelectItem value="cancelled">Cancel</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {o.status === "paid" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => statusMutation.mutate({ id: o._id, status: "completed" })}
                >
                  Complete
                </Button>
              )}
            </>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (o: Order) => (
        <Button variant="ghost" size="icon" onClick={() => openDetail(o._id)}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <Header title="Orders" subtitle="Manage sales and order history" />
      <div className="flex-1 p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total Orders"
            value={total}
            icon={ShoppingCart}
            description="All time"
          />
          <StatCard
            title="Revenue"
            value={formatCurrency(orders.filter((o) => ["paid", "completed"].includes(o.status)).reduce((s, o) => s + o.total, 0))}
            icon={DollarSign}
            description="Paid orders (this page)"
            iconClassName="bg-green-100"
          />
          <StatCard
            title="Pending"
            value={pendingCount}
            icon={Clock}
            description="Awaiting approval / payment"
            iconClassName="bg-yellow-100"
          />
          <StatCard
            title="Approved"
            value={approvedCount}
            icon={CheckCircle}
            description="Approved, awaiting payment"
            iconClassName="bg-blue-100"
          />
        </div>

        <div className="flex items-center justify-between">
          <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>
          </Tabs>
          <RoleGuard requiredPermissions={["manage:orders"]}>
            <Button size="sm" onClick={() => { setB2bForm(defaultB2BForm); setB2bError(""); setB2bOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> B2B Order
            </Button>
          </RoleGuard>
        </div>

        <DataTable
          columns={columns}
          data={orders}
          loading={isLoading}
          keyExtractor={(o) => o._id}
          emptyMessage="No orders found."
          page={page}
          totalPages={Math.ceil(total / 20)}
          onPageChange={setPage}
        />
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Order {selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {selectedOrder.type === "B2B" ? (
                  <>
                    <div>
                      <p className="text-muted-foreground">Seller</p>
                      <p className="font-medium">{selectedOrder.sellerOrganizationId?.name ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Buyer</p>
                      <p className="font-medium">{selectedOrder.buyerOrganizationId?.name ?? "—"}</p>
                    </div>
                  </>
                ) : (
                  <div>
                    <p className="text-muted-foreground">Customer</p>
                    <p className="font-medium">{selectedOrder.memberName ?? "Walk-in"}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Cashier</p>
                  <p className="font-medium">{selectedOrder.cashierId?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment</p>
                  <p className="font-medium capitalize">{selectedOrder.paymentMethod.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDateTime(selectedOrder.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={STATUS_BADGE[selectedOrder.status] ?? "secondary"}>{selectedOrder.status}</Badge>
                </div>
              </div>

              <div className="border rounded-lg divide-y">
                {selectedOrder.items?.map((item) => (
                  <div key={item._id} className="flex justify-between items-center p-3">
                    <div>
                      <p className="text-sm font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.sku} × {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(item.total)}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-sm border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(selectedOrder.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-1">
                  <span>Total</span>
                  <span>{formatCurrency(selectedOrder.total)}</span>
                </div>
                {selectedOrder.amountPaid > 0 && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Amount Paid</span>
                      <span>{formatCurrency(selectedOrder.amountPaid)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Change</span>
                      <span>{formatCurrency(selectedOrder.change)}</span>
                    </div>
                  </>
                )}
              </div>

              {selectedOrder.notes && (
                <p className="text-sm text-muted-foreground border-t pt-2">
                  Notes: {selectedOrder.notes}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* B2B Order Dialog */}
      <Dialog open={b2bOpen} onOpenChange={setB2bOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create B2B Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Seller Organization</Label>
                <Select
                  value={b2bForm.sellerOrganizationId}
                  onValueChange={(v) => setB2bForm((p) => ({ ...p, sellerOrganizationId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select seller" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations
                      .filter((o) => o._id !== b2bForm.buyerOrganizationId)
                      .map((o) => (
                        <SelectItem key={o._id} value={o._id}>
                          {o.name} ({o.type})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Buyer Organization</Label>
                <Select
                  value={b2bForm.buyerOrganizationId}
                  onValueChange={(v) => setB2bForm((p) => ({ ...p, buyerOrganizationId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select buyer" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations
                      .filter((o) => o._id !== b2bForm.sellerOrganizationId)
                      .map((o) => (
                        <SelectItem key={o._id} value={o._id}>
                          {o.name} ({o.type})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Payment Method</Label>
                <Select
                  value={b2bForm.paymentMethod}
                  onValueChange={(v) => setB2bForm((p) => ({ ...p, paymentMethod: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="gcash">GCash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Discount %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={b2bForm.discountPercent}
                  onChange={(e) => setB2bForm((p) => ({ ...p, discountPercent: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addB2BItem}>
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>
              {b2bForm.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end border rounded p-2">
                  <div className="col-span-4 space-y-1">
                    <Label className="text-xs">Product Name</Label>
                    <Input
                      placeholder="Product name"
                      value={item.productName}
                      onChange={(e) => updateB2BItem(idx, "productName", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">SKU</Label>
                    <Input
                      placeholder="SKU"
                      value={item.sku}
                      onChange={(e) => updateB2BItem(idx, "sku", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateB2BItem(idx, "quantity", Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitPrice}
                      onChange={(e) => updateB2BItem(idx, "unitPrice", Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeB2BItem(idx)}
                      disabled={b2bForm.items.length === 1}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Input
                placeholder="Optional notes"
                value={b2bForm.notes}
                onChange={(e) => setB2bForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <div className="text-sm text-right font-semibold">
              Total: {formatCurrency(
                b2bForm.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) *
                  (1 - b2bForm.discountPercent / 100)
              )}
            </div>

            {b2bError && <p className="text-sm text-destructive">{b2bError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setB2bOpen(false)}>Cancel</Button>
            <Button
              onClick={() => b2bMutation.mutate(b2bForm)}
              disabled={b2bMutation.isPending || !b2bForm.sellerOrganizationId || !b2bForm.buyerOrganizationId}
            >
              {b2bMutation.isPending ? "Creating…" : "Create Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
