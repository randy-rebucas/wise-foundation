"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatCurrency, useFormatDate, useTenant } from "@/components/providers/TenantProvider";
import { formatCurrencyCompactAxis } from "@/lib/utils";

interface SalesData {
  _id: string;
  revenue: number;
  orders: number;
}

interface SalesChartProps {
  data: SalesData[];
}

export function SalesChart({ data }: SalesChartProps) {
  const formatMoney = useFormatCurrency();
  const formatDay = useFormatDate();
  const { currency } = useTenant();
  const chartData = data.map((d) => ({
    date: formatDay(d._id),
    Revenue: d.revenue,
    Orders: d.orders,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sales Trend (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => formatCurrencyCompactAxis(Number(v), currency)}
            />
            <Tooltip
              formatter={(value) => [formatMoney(Number(value)), "Revenue"]}
              labelStyle={{ fontWeight: 600 }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--background))",
              }}
            />
            <Area
              type="monotone"
              dataKey="Revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
