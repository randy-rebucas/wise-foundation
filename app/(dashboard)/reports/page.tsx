"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/shared/StatCard";
import { SalesChart } from "@/components/reports/SalesChart";
import { BranchPerformance } from "@/components/reports/BranchPerformance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
  Building2,
  Percent,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  homecare: "bg-blue-100 text-blue-800",
  cosmetics: "bg-pink-100 text-pink-800",
  wellness: "bg-green-100 text-green-800",
  scent: "bg-purple-100 text-purple-800",
};

const ORG_TYPE_COLORS: Record<string, string> = {
  distributor: "bg-blue-100 text-blue-800",
  franchise: "bg-purple-100 text-purple-800",
  partner: "bg-green-100 text-green-800",
};

const BAR_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

const DAYS_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

interface TopOrgItem {
  orgId: string;
  name: string;
  type: string;
  commissionRate: number;
  revenue: number;
  orders: number;
  totalCommission: number;
  pendingCommission: number;
}

interface OrgInventoryItem {
  orgId: string;
  orgName: string;
  orgType: string;
  totalProducts: number;
  totalUnits: number;
  lowStockCount: number;
}

interface DistributionData {
  orgCounts: { distributor: number; franchise: number; partner: number };
  revenueByType: {
    distributor: { revenue: number; orders: number };
    franchise: { revenue: number; orders: number };
    partner: { revenue: number; orders: number };
  };
  commissions: { total: number; pending: number };
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? "";
  const [days, setDays] = useState("30");

  // Branch/Global summary (existing)
  const { data: report, isLoading } = useQuery({
    queryKey: ["reports-summary", days],
    queryFn: async () => {
      const res = await fetch(`/api/reports?type=summary&days=${days}`);
      const data = await res.json();
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Org summary
  const { data: orgReport, isLoading: orgLoading } = useQuery({
    queryKey: ["reports-org-summary", days],
    queryFn: async () => {
      const res = await fetch(`/api/reports?type=org-summary&days=${days}`);
      const data = await res.json();
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const summary = report?.sales?.summary;
  const orgSalesSummary = orgReport?.orgSales?.summary;
  const topOrgs: TopOrgItem[] = orgReport?.topOrgs ?? [];
  const distribution: DistributionData | undefined = orgReport?.distribution;
  const orgInventory: OrgInventoryItem[] = orgReport?.orgInventory ?? [];

  const distChartData = distribution
    ? [
        { name: "Distributor", revenue: distribution.revenueByType.distributor.revenue, orders: distribution.revenueByType.distributor.orders },
        { name: "Franchise", revenue: distribution.revenueByType.franchise.revenue, orders: distribution.revenueByType.franchise.orders },
        { name: "Partner", revenue: distribution.revenueByType.partner.revenue, orders: distribution.revenueByType.partner.orders },
      ]
    : [];

  const isAdmin = userRole === "ADMIN";

  return (
    <div className="flex flex-col">
      <Header title="Reports" subtitle="Business intelligence & performance metrics" />
      <div className="flex-1 p-6 space-y-6">
        {/* Global KPIs */}
        <div className="flex items-center justify-between">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 flex-1">
            <StatCard
              title="Revenue"
              value={isLoading ? "…" : formatCurrency(summary?.totalRevenue ?? 0)}
              icon={DollarSign}
              description={`${summary?.totalOrders ?? 0} orders`}
              iconClassName="bg-green-100"
            />
            <StatCard
              title="Avg Order"
              value={isLoading ? "…" : formatCurrency(summary?.avgOrderValue ?? 0)}
              icon={TrendingUp}
              description="Per transaction"
              iconClassName="bg-blue-100"
            />
            <StatCard
              title="Members"
              value={report?.memberStats?.total ?? "…"}
              icon={Users}
              description={`${report?.memberStats?.newThisMonth ?? 0} new`}
              iconClassName="bg-purple-100"
            />
            <StatCard
              title="Stock Alerts"
              value={report?.alerts?.length ?? "…"}
              icon={AlertTriangle}
              description="Low / out of stock"
              iconClassName="bg-yellow-100"
            />
          </div>
          <div className="ml-4 w-40 flex-shrink-0">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">Top Products</TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
            {isAdmin && <TabsTrigger value="organizations">Organizations</TabsTrigger>}
            {isAdmin && <TabsTrigger value="distribution">Distribution</TabsTrigger>}
            <TabsTrigger value="inventory">Org Inventory</TabsTrigger>
            <TabsTrigger value="alerts">Stock Alerts</TabsTrigger>
          </TabsList>

          {/* ── Overview ─────────────────────────────────────────────── */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <SalesChart data={report?.sales?.dailySales ?? []} />
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" /> Top 5 Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(report?.topProducts ?? []).slice(0, 5).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {(report?.topProducts ?? []).slice(0, 5).map(
                        (product: { _id: string; productName: string; sku: string; totalRevenue: number; totalQuantity: number }, i: number) => (
                          <div key={product._id} className="flex items-center gap-3">
                            <span className="text-lg font-bold text-muted-foreground w-6">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{product.productName}</p>
                              <p className="text-xs text-muted-foreground">{product.sku}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">{formatCurrency(product.totalRevenue)}</p>
                              <p className="text-xs text-muted-foreground">{product.totalQuantity} units</p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" /> Member Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Total Members", value: report?.memberStats?.total ?? 0 },
                    { label: "Active", value: report?.memberStats?.active ?? 0 },
                    { label: "New This Month", value: report?.memberStats?.newThisMonth ?? 0 },
                    { label: "Discounts Given", value: formatCurrency(summary?.totalDiscount ?? 0) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Top Products ─────────────────────────────────────────── */}
          <TabsContent value="products" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Products This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(report?.topProducts ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                  ) : (
                    (report?.topProducts ?? []).map(
                      (product: { _id: string; productName: string; sku: string; category: string; totalRevenue: number; totalQuantity: number }, i: number) => (
                        <div key={product._id} className="flex items-center gap-4 p-3 rounded-lg border">
                          <span className="text-xl font-bold text-muted-foreground w-8 text-center">
                            #{i + 1}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{product.productName}</p>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[product.category] ?? "bg-gray-100 text-gray-800"}`}>
                                {product.category}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(product.totalRevenue)}</p>
                            <p className="text-sm text-muted-foreground">{product.totalQuantity} sold</p>
                          </div>
                        </div>
                      )
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Branch Performance ────────────────────────────────────── */}
          <TabsContent value="branches" className="mt-4 space-y-4">
            <BranchPerformance data={report?.branchPerf ?? []} />
            <div className="grid gap-3">
              {(report?.branchPerf ?? []).map((branch: { branchId: string; branchName: string; branchCode: string; revenue: number; orders: number }) => (
                <Card key={branch.branchId}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-semibold">{branch.branchName}</p>
                      <p className="text-xs text-muted-foreground">Code: {branch.branchCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(branch.revenue)}</p>
                      <p className="text-sm text-muted-foreground">{branch.orders} orders</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Organizations ─────────────────────────────────────────── */}
          {isAdmin && (
            <TabsContent value="organizations" className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  title="Org Revenue"
                  value={orgLoading ? "…" : formatCurrency(orgSalesSummary?.totalRevenue ?? 0)}
                  icon={DollarSign}
                  description={`${orgSalesSummary?.totalOrders ?? 0} org orders`}
                  iconClassName="bg-green-100"
                />
                <StatCard
                  title="Avg Org Order"
                  value={orgLoading ? "…" : formatCurrency(orgSalesSummary?.avgOrderValue ?? 0)}
                  icon={TrendingUp}
                  description="Per org transaction"
                  iconClassName="bg-blue-100"
                />
                <StatCard
                  title="Total Commissions"
                  value={orgLoading ? "…" : formatCurrency(distribution?.commissions?.total ?? 0)}
                  icon={Percent}
                  description={`${formatCurrency(distribution?.commissions?.pending ?? 0)} pending`}
                  iconClassName="bg-yellow-100"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Top Organizations by Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topOrgs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No data yet</p>
                  ) : (
                    <div className="space-y-2">
                      {topOrgs.map((org, i) => (
                        <div key={org.orgId} className="flex items-center gap-4 p-3 rounded-lg border">
                          <span className="text-lg font-bold text-muted-foreground w-6">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{org.name}</p>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ORG_TYPE_COLORS[org.type] ?? "bg-gray-100 text-gray-800"}`}>
                                {org.type}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {org.orders} orders · {org.commissionRate}% commission rate
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">{formatCurrency(org.revenue)}</p>
                            <p className="text-xs text-yellow-600">{formatCurrency(org.pendingCommission)} due</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── Distribution ─────────────────────────────────────────── */}
          {isAdmin && (
            <TabsContent value="distribution" className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {(["distributor", "franchise", "partner"] as const).map((type) => (
                  <Card key={type}>
                    <CardContent className="pt-5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ORG_TYPE_COLORS[type]}`}>
                          {type}
                        </span>
                        <span className="text-sm font-medium text-muted-foreground">
                          {distribution?.orgCounts[type] ?? 0} orgs
                        </span>
                      </div>
                      <p className="text-2xl font-bold">
                        {formatCurrency(distribution?.revenueByType[type]?.revenue ?? 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {distribution?.revenueByType[type]?.orders ?? 0} orders in period
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue by Organization Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={distChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                        contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                      />
                      <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                        {distChartData.map((_, idx) => (
                          <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Percent className="h-4 w-4" /> Commission Pipeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Commissions Generated</p>
                      <p className="text-2xl font-bold">{formatCurrency(distribution?.commissions?.total ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pending Payout</p>
                      <p className="text-2xl font-bold text-yellow-600">{formatCurrency(distribution?.commissions?.pending ?? 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── Org Inventory ─────────────────────────────────────────── */}
          <TabsContent value="inventory" className="mt-4 space-y-3">
            {orgInventory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No organization inventory data.</p>
            ) : (
              orgInventory.map((item) => (
                <Card key={item.orgId}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{item.orgName}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ORG_TYPE_COLORS[item.orgType] ?? "bg-gray-100 text-gray-800"}`}>
                          {item.orgType}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.totalProducts} products</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-lg">{item.totalUnits}</p>
                        <p className="text-xs text-muted-foreground">total units</p>
                      </div>
                      {item.lowStockCount > 0 && (
                        <Badge variant="warning">{item.lowStockCount} low stock</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ── Stock Alerts ─────────────────────────────────────────── */}
          <TabsContent value="alerts" className="mt-4 space-y-3">
            {(report?.alerts ?? []).length === 0 ? (
              <Alert variant="success">
                <AlertTitle>All Good!</AlertTitle>
                <AlertDescription>No low stock alerts. All products are sufficiently stocked.</AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{report?.alerts?.length} Low Stock Alerts</AlertTitle>
                  <AlertDescription>These products need restocking to avoid stockouts.</AlertDescription>
                </Alert>
                {(report?.alerts ?? []).map((alert: { _id: string; quantity: number; lowStockThreshold: number; productId: { name: string; sku: string }; branchId: { name: string; code: string } }) => (
                  <Card key={alert._id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-medium">{alert.productId?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.productId?.sku} · {alert.branchId?.name} ({alert.branchId?.code})
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`font-bold ${alert.quantity === 0 ? "text-red-600" : "text-yellow-600"}`}>
                            {alert.quantity} units
                          </p>
                          <p className="text-xs text-muted-foreground">Min: {alert.lowStockThreshold}</p>
                        </div>
                        <Badge variant={alert.quantity === 0 ? "destructive" : "warning"}>
                          {alert.quantity === 0 ? "Out of Stock" : "Low Stock"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
