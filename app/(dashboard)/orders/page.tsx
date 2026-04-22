"use client";

import { useState, useEffect, type FormEvent } from "react";
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
  Truck,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ORDER_PAID_STATUSES } from "@/types";
import { RoleGuard } from "@/components/layout/RoleGuard";

interface Organization {
  _id: string;
  name: string;
  type: string;
  settings: {
    canDistribute: boolean;
    canSubmitOrders: boolean;
  };
}

interface Order {
  _id: string;
  orderNumber: string;
  type: "POS" | "DISTRIBUTOR" | "B2B";
  status: "pending" | "approved" | "paid" | "delivered" | "completed" | "cancelled" | "refunded";
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
  deliveryReceiptNumber?: string;
  receivedByName?: string;
  deliveredAt?: string;
  deliveredBy?: { name: string } | null;
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
  delivered: "default",
  completed: "success",
  cancelled: "destructive",
  refunded: "secondary",
};

const TYPE_BADGE_CLASS: Record<string, string> = {
  POS: "bg-blue-100 text-blue-800",
  DISTRIBUTOR: "bg-purple-100 text-purple-800",
  B2B: "bg-orange-100 text-orange-800",
};

interface ProductHit {
  _id: string;
  name: string;
  sku: string;
  retailPrice: number;
  memberPrice: number;
  distributorPrice: number;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

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
  const [deliveryForId, setDeliveryForId] = useState<string | null>(null);
  const [deliveryReceipt, setDeliveryReceipt] = useState("");
  const [deliveryReceivedBy, setDeliveryReceivedBy] = useState("");
  const [deliveryError, setDeliveryError] = useState("");
  const [b2bSuggestRow, setB2bSuggestRow] = useState<number | null>(null);

  const b2bSuggestQuery =
    b2bSuggestRow !== null ? (b2bForm.items[b2bSuggestRow]?.productName ?? "").trim() : "";
  const debouncedB2bSuggestQuery = useDebouncedValue(b2bSuggestQuery, 280);

  const { data: b2bProductHits = [], isFetching: b2bProductsLoading } = useQuery({
    queryKey: ["products-b2b-autocomplete", debouncedB2bSuggestQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "30",
        search: debouncedB2bSuggestQuery,
        isActive: "true",
      });
      const res = await fetch(`/api/products?${params}`);
      const j = await res.json();
      if (!j.success) return [];
      return (j.data ?? []) as ProductHit[];
    },
    enabled: b2bOpen && debouncedB2bSuggestQuery.length >= 2,
  });

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
    mutationFn: async ({
      id,
      status,
      delivery,
    }: {
      id: string;
      status: string;
      delivery?: { deliveryReceiptNumber: string; receivedByName?: string };
    }) => {
      const body: Record<string, unknown> = { status };
      if (delivery) {
        body.deliveryReceiptNumber = delivery.deliveryReceiptNumber;
        if (delivery.receivedByName) body.receivedByName = delivery.receivedByName;
      }
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  async function submitDelivery(e: FormEvent) {
    e.preventDefault();
    setDeliveryError("");
    if (!deliveryForId) return;
    const receipt = deliveryReceipt.trim();
    if (!receipt) {
      setDeliveryError("Delivery receipt number is required.");
      return;
    }
    try {
      await statusMutation.mutateAsync({
        id: deliveryForId,
        status: "delivered",
        delivery: {
          deliveryReceiptNumber: receipt,
          receivedByName: deliveryReceivedBy.trim() || undefined,
        },
      });
      setDeliveryForId(null);
      setDeliveryReceipt("");
      setDeliveryReceivedBy("");
    } catch (err) {
      setDeliveryError(err instanceof Error ? err.message : "Could not record delivery.");
    }
  }

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
      setB2bSuggestRow(null);
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

  function patchB2BItem(idx: number, patch: Partial<B2BItem>) {
    setB2bForm((prev) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], ...patch };
      return { ...prev, items };
    });
  }

  function selectB2BProduct(idx: number, p: ProductHit) {
    patchB2BItem(idx, {
      productId: p._id,
      productName: p.name,
      sku: p.sku,
      variantId: undefined,
      unitPrice: p.distributorPrice > 0 ? p.distributorPrice : p.retailPrice,
    });
    setB2bSuggestRow(null);
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
        <div className="max-w-[10rem] text-sm sm:max-w-[14rem] md:max-w-none">
          {o.type === "B2B" ? (
            <div className="min-w-0">
              <p className="truncate font-medium">{o.buyerOrganizationId?.name ?? "—"}</p>
              <p className="truncate text-xs text-muted-foreground">from {o.sellerOrganizationId?.name ?? "—"}</p>
            </div>
          ) : (
            <span className="line-clamp-2">{o.memberName ?? <span className="text-muted-foreground">Walk-in</span>}</span>
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
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Badge variant={STATUS_BADGE[o.status] ?? "secondary"} className="w-fit">{o.status}</Badge>
          {canManageOrders && (
            <>
              {o.status === "pending" && (
                <Select onValueChange={(v) => statusMutation.mutate({ id: o._id, status: v })}>
                  <SelectTrigger className="h-8 w-full text-xs sm:h-6 sm:w-28">
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
                  <SelectTrigger className="h-8 w-full text-xs sm:h-6 sm:w-24">
                    <SelectValue placeholder="Update" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Mark Paid</SelectItem>
                    <SelectItem value="cancelled">Cancel</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {o.status === "paid" && (
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 flex-1 text-xs sm:h-6 sm:flex-none"
                    onClick={() => {
                      setDeliveryReceipt("");
                      setDeliveryReceivedBy("");
                      setDeliveryError("");
                      setDeliveryForId(o._id);
                    }}
                  >
                    <Truck className="h-3 w-3 mr-0.5" />
                    Deliver
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 flex-1 text-xs sm:h-6 sm:flex-none"
                    onClick={() => statusMutation.mutate({ id: o._id, status: "completed" })}
                  >
                    Complete
                  </Button>
                </div>
              )}
              {o.status === "delivered" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full text-xs sm:h-6 sm:w-auto"
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
      <div className="flex-1 space-y-4 p-4 sm:space-y-6 sm:p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard
            title="Total Orders"
            value={total}
            icon={ShoppingCart}
            description="All time"
          />
          <StatCard
            title="Revenue"
            value={formatCurrency(
              orders
                .filter((o) => (ORDER_PAID_STATUSES as readonly string[]).includes(o.status))
                .reduce((s, o) => s + o.total, 0)
            )}
            icon={DollarSign}
            description="Paid / delivered / completed (this page)"
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

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full min-w-0 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
            <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <TabsList className="inline-flex h-auto w-max min-w-full flex-wrap justify-start gap-1 p-1 sm:h-10 sm:w-auto sm:flex-nowrap">
                <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs sm:text-sm">Pending</TabsTrigger>
                <TabsTrigger value="approved" className="text-xs sm:text-sm">Approved</TabsTrigger>
                <TabsTrigger value="paid" className="text-xs sm:text-sm">Paid</TabsTrigger>
                <TabsTrigger value="delivered" className="text-xs sm:text-sm">Delivered</TabsTrigger>
                <TabsTrigger value="completed" className="text-xs sm:text-sm">Completed</TabsTrigger>
                <TabsTrigger value="cancelled" className="text-xs sm:text-sm">Cancelled</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <RoleGuard requiredPermissions={["manage:orders"]}>
            <Button
              size="sm"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => {
                setB2bForm(defaultB2BForm);
                setB2bError("");
                setB2bSuggestRow(null);
                setB2bOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Create Order
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
            <DialogTitle className="flex flex-wrap items-center gap-2 break-all">
              <ClipboardList className="h-5 w-5 shrink-0" />
              Order {selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:gap-2">
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

              {(selectedOrder.deliveryReceiptNumber || selectedOrder.deliveredAt) && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                  <p className="font-medium text-foreground">Delivery receipt</p>
                  {selectedOrder.deliveryReceiptNumber && (
                    <p>
                      <span className="text-muted-foreground">Receipt # </span>
                      <span className="font-mono font-medium">{selectedOrder.deliveryReceiptNumber}</span>
                    </p>
                  )}
                  {selectedOrder.receivedByName && (
                    <p>
                      <span className="text-muted-foreground">Received by </span>
                      {selectedOrder.receivedByName}
                    </p>
                  )}
                  {selectedOrder.deliveredAt && (
                    <p>
                      <span className="text-muted-foreground">Delivered </span>
                      {formatDateTime(selectedOrder.deliveredAt)}
                      {selectedOrder.deliveredBy?.name && (
                        <span className="text-muted-foreground"> · {selectedOrder.deliveredBy.name}</span>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={deliveryForId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeliveryForId(null);
            setDeliveryError("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Record delivery
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitDelivery} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the delivery receipt reference shown on the signed delivery document.
            </p>
            <div className="space-y-1">
              <Label htmlFor="delivery-receipt">Receipt number</Label>
              <Input
                id="delivery-receipt"
                value={deliveryReceipt}
                onChange={(e) => setDeliveryReceipt(e.target.value)}
                placeholder="e.g. DR-2026-0042"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="delivery-received-by">Received by (optional)</Label>
              <Input
                id="delivery-received-by"
                value={deliveryReceivedBy}
                onChange={(e) => setDeliveryReceivedBy(e.target.value)}
                placeholder="Signatory or contact name"
                autoComplete="name"
              />
            </div>
            {deliveryError && <p className="text-sm text-destructive">{deliveryError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeliveryForId(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={statusMutation.isPending}>
                {statusMutation.isPending ? "Saving…" : "Mark delivered"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* B2B Order Dialog */}
      <Dialog
        open={b2bOpen}
        onOpenChange={(open) => {
          setB2bOpen(open);
          if (!open) setB2bSuggestRow(null);
        }}
      >
        <DialogContent className="max-w-2xl overflow-y-visible sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create B2B Order</DialogTitle>
          </DialogHeader>
          <div className="max-h-[min(70vh,32rem)] space-y-4 overflow-y-auto pr-1 sm:max-h-[min(75vh,40rem)]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      .filter((o) => o.settings?.canDistribute && o._id !== b2bForm.buyerOrganizationId)
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
                      .filter((o) => o.settings?.canSubmitOrders && o._id !== b2bForm.sellerOrganizationId)
                      .map((o) => (
                        <SelectItem key={o._id} value={o._id}>
                          {o.name} ({o.type})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <div
                  key={idx}
                  className="flex flex-col gap-2 border rounded p-2 sm:grid sm:grid-cols-12 sm:items-end sm:gap-2"
                >
                  <div className="relative space-y-1 sm:col-span-4">
                    <Label className="text-xs">Product Name</Label>
                    <Input
                      placeholder="Type to search catalog…"
                      value={item.productName}
                      autoComplete="off"
                      onFocus={() => setB2bSuggestRow(idx)}
                      onChange={(e) => {
                        updateB2BItem(idx, "productName", e.target.value);
                        setB2bSuggestRow(idx);
                        if (e.target.value.trim() === "") {
                          patchB2BItem(idx, { productId: "", variantId: undefined });
                        }
                      }}
                      onBlur={() => {
                        window.setTimeout(() => {
                          setB2bSuggestRow((cur) => (cur === idx ? null : cur));
                        }, 180);
                      }}
                    />
                    {b2bSuggestRow === idx && b2bSuggestQuery.length >= 2 && (
                      <div
                        className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md"
                        role="listbox"
                      >
                        {b2bProductsLoading ? (
                          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Searching…
                          </div>
                        ) : b2bProductHits.length === 0 ? (
                          <p className="px-3 py-3 text-sm text-muted-foreground">No matching products.</p>
                        ) : (
                          b2bProductHits.map((p) => (
                            <button
                              key={p._id}
                              type="button"
                              role="option"
                              className="flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => selectB2BProduct(idx, p)}
                            >
                              <span className="font-medium">{p.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {p.sku} · {formatCurrency(p.distributorPrice > 0 ? p.distributorPrice : p.retailPrice)}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">SKU</Label>
                    <Input
                      placeholder="SKU"
                      value={item.sku}
                      onChange={(e) => updateB2BItem(idx, "sku", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateB2BItem(idx, "quantity", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-3">
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitPrice}
                      onChange={(e) => updateB2BItem(idx, "unitPrice", Number(e.target.value))}
                    />
                  </div>
                  <div className="flex justify-end sm:col-span-1 sm:justify-end">
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
