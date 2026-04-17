"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface BranchData {
  branchId: string;
  branchName: string;
  branchCode: string;
  revenue: number;
  orders: number;
}

interface BranchPerformanceProps {
  data: BranchData[];
}

export function BranchPerformance({ data }: BranchPerformanceProps) {
  const chartData = data.map((d) => ({
    name: d.branchCode,
    Revenue: d.revenue,
    Orders: d.orders,
    fullName: d.branchName,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Branch Performance (This Month)</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            No branch data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value, name) => [
                  String(name) === "Revenue" ? formatCurrency(Number(value)) : value,
                  String(name ?? ""),
                ]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--background))",
                }}
              />
              <Bar dataKey="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
