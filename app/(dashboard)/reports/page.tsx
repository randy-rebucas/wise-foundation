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
import { Skeleton } from "@/components/ui/skeleton";
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
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
  Building2,
  Percent,
  GitBranch,
  LayoutGrid,
  Boxes,
  ShieldAlert,
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
  headquarters: "bg-orange-100 text-orange-800",
};

const BAR_COLORS = ["#f97316", "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"];

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
  orgCounts: { distributor: number; franchise: number; partner: number; headquarters: number };
  revenueByType: {
    distributor: { revenue: number; orders: number };
    franchise: { revenue: number; orders: number };
    partner: { revenue: number; orders: number };
    headquarters: { revenue: number; orders: number };
  };
  commissions: { total: number; pending: number };
}

function KpiSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? "";
  const [days, setDays] = useState("30");

  const { data: report, isLoading } = useQuery({
    queryKey: ["reports-summary", days],
    queryFn: async () => {
      const res = await fetch(`/api/reports?type=summary&days=${days}`);
      return (await res.json()).data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: orgReport, isLoading: orgLoading } = useQuery({
    queryKey: ["reports-org-summary", days],
    queryFn: async () => {
      const res = await fetch(`/api/reports?type=org-summary&days=${days}`);
      return (await res.json()).data;
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
        { name: "HQ", revenue: distribution.revenueByType.headquarters.revenue, orders: distribution.revenueByType.headquarters.orders },
        { name: "Distributor", revenue: distribution.revenueByType.distributor.revenue, orders: distribution.revenueByType.distributor.orders },
        { name: "Franchise", revenue: distribution.revenueByType.franchise.revenue, orders: distribution.revenueByType.franchise.orders },
        { name: "Partner", revenue: distribution.revenueByType.partner.revenue, orders: distribution.revenueByType.partner.orders },
      ]
    : [];

  const isAdmin = userRole === "ADMIN";
  const isOrgAdmin = userRole === "ORG_ADMIN";

  const activeSummary = isOrgAdmin ? orgSalesSummary : summary;
  const activeLoading = isOrgAdmin ? orgLoading : isLoading;

  const maxOrgRevenue = topOrgs.length > 0 ? topOrgs[0].revenue : 1;
  const maxOrgInventory = orgInventory.length > 0 ? Math.max(...orgInventory.map((i) => i.totalUnits)) : 1;
  const topProducts = report?.topProducts ?? [];
  const maxProductRevenue = topProducts.length > 0 ? topProducts[0].totalRevenue : 1;

  return (
    <div className="flex flex-col">
      <Header
        title="Reports"
        subtitle="Business intelligence & performance metrics"
        action={
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* KPI Cards */}
        <div className={`grid gap-4 grid-cols-2 ${isAdmin ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
          {activeLoading ? (
            Array.from({ length: isAdmin ? 4 : 3 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-5"><KpiSkeleton /></CardContent></Card>
            ))
          ) : (
            <>
              <StatCard
                title="Revenue"
                value={formatCurrency(activeSummary?.totalRevenue ?? 0)}
                icon={DollarSign}
                description={`${activeSummary?.totalOrders ?? 0} orders`}
                iconClassName="bg-green-100"
              />
              <StatCard
                title="Avg Order"
                value={formatCurrency(activeSummary?.avgOrderValue ?? 0)}
                icon={TrendingUp}
                description="Per transaction"
                iconClassName="bg-blue-100"
              />
              {isAdmin && (
                <StatCard
                  title="Members"
                  value={report?.memberStats?.total ?? 0}
                  icon={Users}
                  description={`${report?.memberStats?.newThisMonth ?? 0} new this month`}
                  iconClassName="bg-purple-100"
                />
              )}
              {isAdmin && (
                <StatCard
                  title="Stock Alerts"
                  value={report?.alerts?.length ?? 0}
                  icon={AlertTriangle}
                  description="Low / out of stock"
                  iconClassName="bg-yellow-100"
                />
              )}
              {isOrgAdmin && (
                <StatCard
                  title="Commissions"
                  value={formatCurrency(distribution?.commissions?.total ?? 0)}
                  icon={Percent}
                  description={`${formatCurrency(distribution?.commissions?.pending ?? 0)} pending`}
                  iconClassName="bg-yellow-100"
                />
              )}
            </>
          )}
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="flex items-center gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" /> Top Products
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="branches" className="flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5" /> Branches
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="organizations" className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Organizations
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="distribution" className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Distribution
              </TabsTrigger>
            )}
            <TabsTrigger value="inventory" className="flex items-center gap-1.5">
              <Boxes className="h-3.5 w-3.5" /> Org Inventory
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="alerts" className="flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" />
                Stock Alerts
                {(report?.alerts?.length ?? 0) > 0 && (
                  <span className="ml-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                    {report.alerts.length}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {/* ── Overview ─────────────────────────────────────────────── */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <SalesChart data={isOrgAdmin ? (orgReport?.orgSales?.dailySales ?? []) : (report?.sales?.dailySales ?? [])} />

            <div className="grid gap-4 md:grid-cols-2">
              {/* Top 5 products */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" /> Top 5 Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                    </div>
                  ) : topProducts.slice(0, 5).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {topProducts.slice(0, 5).map(
                        (product: { _id: string; productName: string; sku: string; totalRevenue: number; totalQuantity: number }, i: number) => (
                          <div key={product._id} className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-muted-foreground w-4 text-right">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate leading-none">{product.productName}</p>
                                <p className="text-xs text-muted-foreground">{product.sku}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold">{formatCurrency(product.totalRevenue)}</p>
                                <p className="text-xs text-muted-foreground">{product.totalQuantity} units</p>
                              </div>
                            </div>
                            <div className="ml-6 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary/60"
                                style={{ width: `${Math.round((product.totalRevenue / maxProductRevenue) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Member summary (admin) / Commission breakdown (org admin) */}
              {isAdmin ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" /> Member Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {[
                          { label: "Total Members", value: report?.memberStats?.total ?? 0 },
                          { label: "Active", value: report?.memberStats?.active ?? 0 },
                          { label: "New This Month", value: report?.memberStats?.newThisMonth ?? 0 },
                          { label: "Discounts Given", value: formatCurrency(summary?.totalDiscount ?? 0) },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between items-center text-sm py-1 border-b border-dashed last:border-0">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-semibold">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Percent className="h-4 w-4 text-muted-foreground" /> Commission Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orgLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {[
                          { label: "Total Earned", value: formatCurrency(distribution?.commissions?.total ?? 0) },
                          { label: "Pending Payout", value: formatCurrency(distribution?.commissions?.pending ?? 0) },
                          { label: "Total Orders", value: orgSalesSummary?.totalOrders ?? 0 },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between items-center text-sm py-1 border-b border-dashed last:border-0">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-semibold">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ── Top Products ─────────────────────────────────────────── */}
          <TabsContent value="products" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Top Products — Period Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">No data yet</p>
                ) : (
                  <div className="space-y-3">
                    {topProducts.map(
                      (product: { _id: string; productName: string; sku: string; category: string; totalRevenue: number; totalQuantity: number }, i: number) => (
                        <div key={product._id} className="space-y-1.5">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-muted-foreground w-6 text-right shrink-0">
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm">{product.productName}</p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_COLORS[product.category] ?? "bg-gray-100 text-gray-800"}`}>
                                  {product.category}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">{product.sku}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-semibold text-sm">{formatCurrency(product.totalRevenue)}</p>
                              <p className="text-xs text-muted-foreground">{product.totalQuantity} sold</p>
                            </div>
                          </div>
                          <div className="ml-9 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/50"
                              style={{ width: `${Math.round((product.totalRevenue / maxProductRevenue) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Branch Performance ────────────────────────────────────── */}
          {isAdmin && (
            <TabsContent value="branches" className="mt-4 space-y-4">
              <BranchPerformance data={report?.branchPerf ?? []} />
            </TabsContent>
          )}

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
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" /> Top Organizations by Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {orgLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : topOrgs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {topOrgs.map((org, i) => (
                        <div key={org.orgId} className="space-y-1.5">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-muted-foreground w-6 text-right shrink-0">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm truncate">{org.name}</p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${ORG_TYPE_COLORS[org.type] ?? "bg-gray-100 text-gray-800"}`}>
                                  {org.type}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {org.orders} orders · {org.commissionRate}% commission
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-semibold text-sm">{formatCurrency(org.revenue)}</p>
                              {org.pendingCommission > 0 && (
                                <p className="text-xs text-yellow-600">{formatCurrency(org.pendingCommission)} due</p>
                              )}
                            </div>
                          </div>
                          <div className="ml-9 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-400"
                              style={{ width: `${Math.round((org.revenue / maxOrgRevenue) * 100)}%` }}
                            />
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
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                {(["headquarters", "distributor", "franchise", "partner"] as const).map((type, idx) => (
                  <Card key={type} className="overflow-hidden">
                    <div className="h-1" style={{ background: BAR_COLORS[idx] }} />
                    <CardContent className="pt-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${ORG_TYPE_COLORS[type]}`}>
                          {type === "headquarters" ? "HQ" : type}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          {distribution?.orgCounts[type] ?? 0} orgs
                        </span>
                      </div>
                      <p className="text-xl font-bold">
                        {formatCurrency(distribution?.revenueByType[type]?.revenue ?? 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {distribution?.revenueByType[type]?.orders ?? 0} orders
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Revenue by Organization Type</CardTitle>
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

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Percent className="h-4 w-4 text-muted-foreground" /> Commission Pipeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Generated</p>
                      <p className="text-2xl font-bold">{formatCurrency(distribution?.commissions?.total ?? 0)}</p>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Pending payout</span>
                        <span className="font-medium text-yellow-600">{formatCurrency(distribution?.commissions?.pending ?? 0)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-yellow-400"
                          style={{
                            width: distribution?.commissions?.total
                              ? `${Math.round(((distribution.commissions.pending ?? 0) / distribution.commissions.total) * 100)}%`
                              : "0%",
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" /> Network Size
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(["headquarters", "distributor", "franchise", "partner"] as const).map((type, idx) => (
                      <div key={type} className="flex items-center gap-3 text-sm">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: BAR_COLORS[idx] }} />
                        <span className="capitalize text-muted-foreground flex-1">{type}</span>
                        <span className="font-semibold">{distribution?.orgCounts[type] ?? 0}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* ── Org Inventory ─────────────────────────────────────────── */}
          <TabsContent value="inventory" className="mt-4">
            {orgLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
              </div>
            ) : orgInventory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Boxes className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No organization inventory data.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orgInventory.map((item) => (
                  <Card key={item.orgId}>
                    <CardContent className="py-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{item.orgName}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${ORG_TYPE_COLORS[item.orgType] ?? "bg-gray-100 text-gray-800"}`}>
                            {item.orgType}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold text-base leading-none">{item.totalUnits.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">units · {item.totalProducts} products</p>
                          </div>
                          {item.lowStockCount > 0 && (
                            <Badge variant="warning" className="text-xs">{item.lowStockCount} low</Badge>
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${item.lowStockCount > 0 ? "bg-yellow-400" : "bg-green-400"}`}
                          style={{ width: `${Math.min(100, Math.round((item.totalUnits / maxOrgInventory) * 100))}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Stock Alerts ─────────────────────────────────────────── */}
          {isAdmin && (
            <TabsContent value="alerts" className="mt-4 space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : (report?.alerts ?? []).length === 0 ? (
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
                  <div className="space-y-2">
                    {(report?.alerts ?? []).map((alert: { _id: string; quantity: number; lowStockThreshold: number; productId: { name: string; sku: string }; branchId: { name: string; code: string } }) => (
                      <Card key={alert._id} className={`border-l-4 ${alert.quantity === 0 ? "border-l-red-500" : "border-l-yellow-400"}`}>
                        <CardContent className="flex items-center justify-between py-3">
                          <div>
                            <p className="font-medium text-sm">{alert.productId?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {alert.productId?.sku} · {alert.branchId?.name} ({alert.branchId?.code})
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className={`font-bold text-sm ${alert.quantity === 0 ? "text-red-600" : "text-yellow-600"}`}>
                                {alert.quantity} units
                              </p>
                              <p className="text-xs text-muted-foreground">Min: {alert.lowStockThreshold}</p>
                            </div>
                            <Badge variant={alert.quantity === 0 ? "destructive" : "warning"}>
                              {alert.quantity === 0 ? "Out" : "Low"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
