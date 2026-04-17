"use client";

import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/shared/StatCard";
import { SalesChart } from "@/components/reports/SalesChart";
import { BranchPerformance } from "@/components/reports/BranchPerformance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ReportData {
  sales: {
    dailySales: { _id: string; revenue: number; orders: number }[];
    summary: {
      totalRevenue: number;
      totalOrders: number;
      totalDiscount: number;
      avgOrderValue: number;
    };
  };
  topProducts: {
    _id: string;
    productName: string;
    sku: string;
    category: string;
    totalQuantity: number;
    totalRevenue: number;
  }[];
  branchPerf: {
    branchId: string;
    branchName: string;
    branchCode: string;
    revenue: number;
    orders: number;
  }[];
  alerts: {
    _id: string;
    quantity: number;
    lowStockThreshold: number;
    productId: { name: string; sku: string; category: string };
    branchId: { name: string; code: string };
  }[];
  memberStats: {
    total: number;
    active: number;
    newThisMonth: number;
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  homecare: "bg-blue-100 text-blue-800",
  cosmetics: "bg-pink-100 text-pink-800",
  wellness: "bg-green-100 text-green-800",
  scent: "bg-purple-100 text-purple-800",
};

export default function ReportsPage() {
  const { data: report, isLoading } = useQuery<ReportData>({
    queryKey: ["reports-summary"],
    queryFn: async () => {
      const res = await fetch("/api/reports?type=summary&days=30");
      const data = await res.json();
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const summary = report?.sales?.summary;

  return (
    <div className="flex flex-col">
      <Header title="Reports" subtitle="Business intelligence & performance metrics" />
      <div className="flex-1 p-6 space-y-6">
        {/* KPI Summary */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue (30d)"
            value={isLoading ? "..." : formatCurrency(summary?.totalRevenue ?? 0)}
            icon={DollarSign}
            description={`${summary?.totalOrders ?? 0} orders`}
            iconClassName="bg-green-100"
          />
          <StatCard
            title="Avg Order Value"
            value={isLoading ? "..." : formatCurrency(summary?.avgOrderValue ?? 0)}
            icon={TrendingUp}
            description="Per transaction"
            iconClassName="bg-blue-100"
          />
          <StatCard
            title="Total Members"
            value={report?.memberStats?.total ?? "..."}
            icon={Users}
            description={`${report?.memberStats?.newThisMonth ?? 0} new this month`}
            iconClassName="bg-purple-100"
          />
          <StatCard
            title="Low Stock Alerts"
            value={report?.alerts?.length ?? "..."}
            icon={AlertTriangle}
            description="Products need attention"
            iconClassName="bg-yellow-100"
          />
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">Top Products</TabsTrigger>
            <TabsTrigger value="branches">Branch Performance</TabsTrigger>
            <TabsTrigger value="alerts">Stock Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <SalesChart data={report?.sales?.dailySales ?? []} />
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Top 5 Products This Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(report?.topProducts ?? []).slice(0, 5).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {(report?.topProducts ?? []).slice(0, 5).map((product, i) => (
                        <div key={product._id} className="flex items-center gap-3">
                          <span className="text-lg font-bold text-muted-foreground w-6">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.productName}</p>
                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {formatCurrency(product.totalRevenue)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {product.totalQuantity} units
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Member Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Total Members", value: report?.memberStats?.total ?? 0 },
                    { label: "Active Members", value: report?.memberStats?.active ?? 0 },
                    { label: "New This Month", value: report?.memberStats?.newThisMonth ?? 0 },
                    {
                      label: "Total Discounts Given (30d)",
                      value: formatCurrency(summary?.totalDiscount ?? 0),
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

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
                    (report?.topProducts ?? []).map((product, i) => (
                      <div
                        key={product._id}
                        className="flex items-center gap-4 p-3 rounded-lg border"
                      >
                        <span className="text-xl font-bold text-muted-foreground w-8 text-center">
                          #{i + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{product.productName}</p>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                CATEGORY_COLORS[product.category] ?? "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {product.category}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{product.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(product.totalRevenue)}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.totalQuantity} sold
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branches" className="mt-4">
            <BranchPerformance data={report?.branchPerf ?? []} />
            <div className="mt-4 grid gap-3">
              {(report?.branchPerf ?? []).map((branch) => (
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

          <TabsContent value="alerts" className="mt-4 space-y-3">
            {(report?.alerts ?? []).length === 0 ? (
              <Alert variant="success">
                <AlertTitle>All Good!</AlertTitle>
                <AlertDescription>
                  No low stock alerts. All products are sufficiently stocked.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{report?.alerts?.length} Low Stock Alerts</AlertTitle>
                  <AlertDescription>
                    These products need restocking to avoid stockouts.
                  </AlertDescription>
                </Alert>
                {(report?.alerts ?? []).map((alert) => (
                  <Card key={alert._id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-medium">{alert.productId?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.productId?.sku} • {alert.branchId?.name} ({alert.branchId?.code})
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p
                            className={`font-bold ${alert.quantity === 0 ? "text-red-600" : "text-yellow-600"}`}
                          >
                            {alert.quantity} units
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Min: {alert.lowStockThreshold}
                          </p>
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
