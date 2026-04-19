"use client";

import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Boxes,
  DollarSign,
  Percent,
  ShoppingCart,
  TrendingUp,
  Package,
  Building2,
  Clock,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";

// ── shared types ─────────────────────────────────────────────────────────────

interface OrgData {
  _id: string;
  name: string;
  type: "distributor" | "franchise" | "partner";
  commissionRate: number;
  settings: {
    canSellRetail: boolean;
    canDistribute: boolean;
    hasInventory: boolean;
    commissionEnabled: boolean;
  };
}

interface OrgInventoryItem {
  _id: string;
  productId: { _id: string; name: string; sku: string; retailPrice: number; distributorPrice: number };
  quantity: number;
  totalSold: number;
}

interface OrderRow {
  _id: string;
  orderNumber: string;
  type: string;
  status: string;
  total: number;
  buyerOrganizationId?: { name: string; type: string } | null;
  sellerOrganizationId?: { name: string; type: string } | null;
  createdAt: string;
}

interface CommissionRow {
  _id: string;
  orderId: { orderNumber: string; total: number; createdAt: string } | null;
  saleAmount: number;
  rate: number;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  paidAt?: string | null;
}

const STATUS_BADGE: Record<string, "default" | "success" | "secondary" | "destructive" | "warning"> = {
  pending: "warning",
  approved: "default",
  paid: "default",
  completed: "success",
  cancelled: "destructive",
  refunded: "secondary",
};

// ── Distributor Panel ─────────────────────────────────────────────────────────

function DistributorPanel({ org }: { org: OrgData }) {
  const queryClient = useQueryClient();

  const { data: inventoryData = [], isLoading: invLoading } = useQuery<OrgInventoryItem[]>({
    queryKey: ["org-inventory", org._id],
    queryFn: async () => {
      const res = await fetch(`/api/organization-inventory?organizationId=${org._id}`);
      const d = await res.json();
      return d.data ?? [];
    },
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["org-outbound-orders", org._id],
    queryFn: async () => {
      const res = await fetch(`/api/orders?limit=20`);
      const d = await res.json();
      return (d.data ?? []) as OrderRow[];
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org-outbound-orders"] }),
  });

  const b2bOrders = (ordersData ?? []).filter((o) => o.type === "B2B");
  const totalUnits = inventoryData.reduce((s, i) => s + i.quantity, 0);
  const lowStock = inventoryData.filter((i) => i.quantity <= 5).length;

  const invColumns = [
    {
      key: "product",
      label: "Product",
      render: (i: OrgInventoryItem) => (
        <div>
          <p className="font-medium text-sm">{i.productId?.name}</p>
          <p className="text-xs text-muted-foreground">{i.productId?.sku}</p>
        </div>
      ),
    },
    {
      key: "stock",
      label: "Stock",
      render: (i: OrgInventoryItem) => (
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${i.quantity <= 5 ? "text-red-600" : i.quantity <= 15 ? "text-yellow-600" : "text-green-600"}`}>
            {i.quantity}
          </span>
          {i.quantity <= 5 && <Badge variant="destructive" className="text-xs">Low</Badge>}
        </div>
      ),
    },
    {
      key: "sold",
      label: "Total Sold",
      render: (i: OrgInventoryItem) => <span className="text-sm">{i.totalSold ?? 0}</span>,
    },
    {
      key: "price",
      label: "Distributor Price",
      render: (i: OrgInventoryItem) => (
        <span className="text-sm">{formatCurrency(i.productId?.distributorPrice ?? 0)}</span>
      ),
    },
  ];

  const orderColumns = [
    {
      key: "order",
      label: "Order",
      render: (o: OrderRow) => (
        <div>
          <p className="font-mono text-sm font-medium">{o.orderNumber}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "buyer",
      label: "Buyer",
      render: (o: OrderRow) => (
        <div>
          <p className="text-sm">{o.buyerOrganizationId?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground capitalize">{o.buyerOrganizationId?.type ?? ""}</p>
        </div>
      ),
    },
    {
      key: "total",
      label: "Total",
      render: (o: OrderRow) => <span className="font-semibold text-sm">{formatCurrency(o.total)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (o: OrderRow) => (
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_BADGE[o.status] ?? "secondary"}>{o.status}</Badge>
          {o.status === "pending" && (
            <Select onValueChange={(v) => statusMutation.mutate({ id: o._id, status: v })}>
              <SelectTrigger className="h-6 w-24 text-xs">
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
              </SelectContent>
            </Select>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Products in Stock" value={inventoryData.length} icon={Package} description="SKUs available" />
        <StatCard title="Total Units" value={totalUnits} icon={Boxes} description="Across all products" iconClassName="bg-blue-100" />
        <StatCard title="Low Stock" value={lowStock} icon={TrendingUp} description="Need restocking" iconClassName="bg-red-100" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2"><Boxes className="h-4 w-4" /> Inventory</span>
            <Link href="/inventory">
              <Button variant="outline" size="sm" className="text-xs">
                Manage Inventory <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={invColumns}
            data={inventoryData}
            loading={invLoading}
            keyExtractor={(i) => i._id}
            emptyMessage="No inventory records."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Distribution Orders (B2B)</span>
            <Link href="/orders">
              <Button variant="outline" size="sm" className="text-xs">
                All Orders <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={orderColumns}
            data={b2bOrders}
            loading={ordersLoading}
            keyExtractor={(o) => o._id}
            emptyMessage="No B2B distribution orders yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Franchise Panel ───────────────────────────────────────────────────────────

function FranchisePanel({ org }: { org: OrgData }) {
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["franchise-orders", org._id],
    queryFn: async () => {
      const res = await fetch("/api/orders?limit=20");
      const d = await res.json();
      return { orders: (d.data ?? []) as OrderRow[], meta: d.meta ?? {} };
    },
  });

  const orders = ordersData?.orders ?? [];
  const paidRevenue = orders
    .filter((o) => ["paid", "completed"].includes(o.status))
    .reduce((s, o) => s + o.total, 0);
  const pendingCount = orders.filter((o) => ["pending", "approved"].includes(o.status)).length;

  const orderColumns = [
    {
      key: "order",
      label: "Order",
      render: (o: OrderRow) => (
        <div>
          <p className="font-mono text-sm font-medium">{o.orderNumber}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (o: OrderRow) => (
        <Badge variant="outline" className="text-xs">{o.type}</Badge>
      ),
    },
    {
      key: "total",
      label: "Total",
      render: (o: OrderRow) => <span className="font-semibold text-sm">{formatCurrency(o.total)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (o: OrderRow) => (
        <Badge variant={STATUS_BADGE[o.status] ?? "secondary"}>{o.status}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Revenue (page)" value={formatCurrency(paidRevenue)} icon={DollarSign} description="Paid orders shown" iconClassName="bg-green-100" />
        <StatCard title="Pending Orders" value={pendingCount} icon={Clock} description="Awaiting action" iconClassName="bg-yellow-100" />
        <StatCard title="Total Orders" value={ordersData?.meta?.total ?? 0} icon={ShoppingCart} description="All time" iconClassName="bg-blue-100" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/pos">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 border-blue-200 hover:border-blue-400">
            <CardContent className="flex items-center gap-4 pt-5">
              <div className="p-3 bg-blue-100 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <p className="font-semibold">Point of Sale</p>
                <p className="text-sm text-muted-foreground">Process walk-in sales</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/reseller-sales">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 border-purple-200 hover:border-purple-400">
            <CardContent className="flex items-center gap-4 pt-5">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-700" />
              </div>
              <div>
                <p className="font-semibold">Reseller Sales</p>
                <p className="text-sm text-muted-foreground">Record community sales</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Recent Sales</span>
            <Link href="/orders">
              <Button variant="outline" size="sm" className="text-xs">
                All Orders <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={orderColumns}
            data={orders}
            loading={isLoading}
            keyExtractor={(o) => o._id}
            emptyMessage="No orders yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Partner Panel ─────────────────────────────────────────────────────────────

function PartnerPanel({ org }: { org: OrgData }) {
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["partner-orders", org._id],
    queryFn: async () => {
      const res = await fetch("/api/orders?limit=20");
      const d = await res.json();
      return (d.data ?? []) as OrderRow[];
    },
  });

  const { data: commissionsData, isLoading: commLoading } = useQuery({
    queryKey: ["partner-commissions", org._id],
    queryFn: async () => {
      const res = await fetch("/api/commissions?limit=10");
      const d = await res.json();
      return d.data ?? [];
    },
  });

  const { data: commSummary } = useQuery({
    queryKey: ["partner-comm-summary", org._id],
    queryFn: async () => {
      const res = await fetch("/api/commissions?summary=true");
      const d = await res.json();
      return d.data ?? { totalEarned: 0, totalPaid: 0, totalPending: 0 };
    },
  });

  const orders = ordersData ?? [];
  const commissions: CommissionRow[] = commissionsData ?? [];

  const orderColumns = [
    {
      key: "order",
      label: "Order",
      render: (o: OrderRow) => (
        <div>
          <p className="font-mono text-sm font-medium">{o.orderNumber}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (o: OrderRow) => <Badge variant="outline" className="text-xs">{o.type}</Badge>,
    },
    {
      key: "total",
      label: "Total",
      render: (o: OrderRow) => <span className="font-semibold">{formatCurrency(o.total)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (o: OrderRow) => (
        <Badge variant={STATUS_BADGE[o.status] ?? "secondary"}>{o.status}</Badge>
      ),
    },
  ];

  const commColumns = [
    {
      key: "order",
      label: "Order",
      render: (c: CommissionRow) => (
        <span className="font-mono text-sm">{c.orderId?.orderNumber ?? "—"}</span>
      ),
    },
    {
      key: "sale",
      label: "Sale",
      render: (c: CommissionRow) => <span className="text-sm">{formatCurrency(c.saleAmount)}</span>,
    },
    {
      key: "rate",
      label: "Rate",
      render: (c: CommissionRow) => <span className="text-sm">{c.rate}%</span>,
    },
    {
      key: "amount",
      label: "Earned",
      render: (c: CommissionRow) => <span className="font-semibold text-sm">{formatCurrency(c.amount)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (c: CommissionRow) => (
        <Badge variant={c.status === "paid" ? "success" : c.status === "cancelled" ? "destructive" : "warning"}>
          {c.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Commission Earned"
          value={formatCurrency(commSummary?.totalEarned ?? 0)}
          icon={Percent}
          description={`Rate: ${org.commissionRate}%`}
          iconClassName="bg-green-100"
        />
        <StatCard
          title="Pending Payout"
          value={formatCurrency(commSummary?.totalPending ?? 0)}
          icon={Clock}
          description="Awaiting payment"
          iconClassName="bg-yellow-100"
        />
        <StatCard
          title="Total Paid Out"
          value={formatCurrency(commSummary?.totalPaid ?? 0)}
          icon={CheckCircle}
          description="Received so far"
          iconClassName="bg-blue-100"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> My Orders</span>
              <Link href="/orders">
                <Button variant="outline" size="sm" className="text-xs">
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={orderColumns}
              data={orders}
              loading={ordersLoading}
              keyExtractor={(o) => o._id}
              emptyMessage="No orders yet."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2"><Percent className="h-4 w-4" /> Commission History</span>
              <Link href="/commissions">
                <Button variant="outline" size="sm" className="text-xs">
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={commColumns}
              data={commissions}
              loading={commLoading}
              keyExtractor={(c) => c._id}
              emptyMessage="No commission records yet."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrgPanelPage() {
  const { data: session } = useSession();
  const orgId = session?.user?.organizationId;

  const { data: orgData, isLoading } = useQuery<OrgData>({
    queryKey: ["my-org", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}`);
      const d = await res.json();
      return d.data;
    },
    enabled: !!orgId,
  });

  if (!orgId) {
    return (
      <div className="flex flex-col">
        <Header title="Organization Panel" subtitle="Your organization workspace" />
        <div className="flex-1 p-6 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No organization assigned to your account.</p>
        </div>
      </div>
    );
  }

  if (isLoading || !orgData) {
    return (
      <div className="flex flex-col">
        <Header title="Organization Panel" subtitle="Loading…" />
        <div className="flex-1 p-6">
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Loading organization data…</div>
        </div>
      </div>
    );
  }

  const subtitleMap = {
    distributor: "Inventory & Distribution",
    franchise: "POS & Sales",
    partner: "Orders & Commissions",
  };

  return (
    <div className="flex flex-col">
      <Header
        title={orgData.name}
        subtitle={subtitleMap[orgData.type] ?? "Organization Panel"}
      />
      <div className="flex-1 p-6">
        {orgData.type === "distributor" && <DistributorPanel org={orgData} />}
        {orgData.type === "franchise" && <FranchisePanel org={orgData} />}
        {orgData.type === "partner" && <PartnerPanel org={orgData} />}
      </div>
    </div>
  );
}
