"use client";

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
import { Percent, Building2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatCurrency, useTenant } from "@/components/providers/TenantProvider";
import { formatCurrencyCompactAxis } from "@/lib/utils";

const BAR_COLORS = ["#f97316", "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"];

const ORG_TYPE_COLORS: Record<string, string> = {
  distributor: "bg-blue-100 text-blue-800",
  franchise: "bg-purple-100 text-purple-800",
  partner: "bg-green-100 text-green-800",
  headquarters: "bg-orange-100 text-orange-800",
};

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

interface DistributionTabProps {
  distribution: DistributionData | undefined;
  error: Error | null;
}

export function DistributionTab({ distribution, error }: DistributionTabProps) {
  const money = useFormatCurrency();
  const { currency } = useTenant();

  const distChartData = distribution
    ? [
        { name: "HQ", revenue: distribution.revenueByType.headquarters.revenue, orders: distribution.revenueByType.headquarters.orders },
        { name: "Distributor", revenue: distribution.revenueByType.distributor.revenue, orders: distribution.revenueByType.distributor.orders },
        { name: "Franchise", revenue: distribution.revenueByType.franchise.revenue, orders: distribution.revenueByType.franchise.orders },
        { name: "Partner", revenue: distribution.revenueByType.partner.revenue, orders: distribution.revenueByType.partner.orders },
      ]
    : [];

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error.message ?? "Unable to load distribution metrics."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
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
                {money(distribution?.revenueByType[type]?.revenue ?? 0)}
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
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrencyCompactAxis(Number(v), currency)} />
              <Tooltip
                formatter={(value) => [money(Number(value)), "Revenue"]}
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
              <p className="text-2xl font-bold">{money(distribution?.commissions?.total ?? 0)}</p>
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Pending payout</span>
                <span className="font-medium text-yellow-600">{money(distribution?.commissions?.pending ?? 0)}</span>
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
    </div>
  );
}
