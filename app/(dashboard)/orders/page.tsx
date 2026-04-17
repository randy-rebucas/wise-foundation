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
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { RoleGuard } from "@/components/layout/RoleGuard";

interface Order {
  _id: string;
  orderNumber: string;
  type: "POS" | "BULK" | "DISTRIBUTOR";
  status: "pending" | "paid" | "completed" | "cancelled" | "refunded";
  memberName?: string;
  cashierId: { name: string };
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

const STATUS_BADGE: Record<string, "default" | "success" | "secondary" | "destructive" | "warning"> = {
  pending: "warning",
  paid: "default",
  completed: "success",
  cancelled: "destructive",
  refunded: "secondary",
};

export default function OrdersPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const branchId = session?.user?.branchIds?.[0] ?? "";

  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: result, isLoading } = useQuery({
    queryKey: ["orders", branchId, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (branchId) params.set("branchId", branchId);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      return data;
    },
    enabled: !!branchId,
  });

  const orders: Order[] = result?.data ?? [];
  const total = result?.meta?.total ?? 0;

  const todayOrders = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === new Date().toDateString()
  );
  const todayRevenue = todayOrders
    .filter((o) => ["paid", "completed"].includes(o.status))
    .reduce((sum, o) => sum + o.total, 0);

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

  async function openDetail(orderId: string) {
    const res = await fetch(`/api/orders/${orderId}`);
    const data = await res.json();
    if (data.success) {
      setSelectedOrder(data.data);
      setDetailOpen(true);
    }
  }

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
        <Badge variant="outline" className="text-xs">
          {o.type}
        </Badge>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      render: (o: Order) => (
        <span className="text-sm">{o.memberName ?? <span className="text-muted-foreground">Walk-in</span>}</span>
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
          <RoleGuard requiredPermissions={["manage:orders"]}>
            {o.status === "pending" && (
              <Select
                onValueChange={(v) => statusMutation.mutate({ id: o._id, status: v })}
              >
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
          </RoleGuard>
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
            title="Today's Orders"
            value={todayOrders.length}
            icon={ShoppingCart}
            description="Transactions today"
          />
          <StatCard
            title="Today's Revenue"
            value={formatCurrency(todayRevenue)}
            icon={DollarSign}
            description="Paid orders"
            iconClassName="bg-green-100"
          />
          <StatCard
            title="Pending"
            value={orders.filter((o) => o.status === "pending").length}
            icon={Clock}
            description="Awaiting payment"
            iconClassName="bg-yellow-100"
          />
          <StatCard
            title="Completed"
            value={orders.filter((o) => o.status === "completed").length}
            icon={CheckCircle}
            description="Fulfilled orders"
            iconClassName="bg-blue-100"
          />
        </div>

        <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

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
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedOrder.memberName ?? "Walk-in"}</p>
                </div>
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
    </div>
  );
}
