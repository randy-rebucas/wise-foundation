"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DataTable } from "@/components/shared/DataTable";
import { AlertTriangle, Package } from "lucide-react";

interface InventoryItem {
  _id: string;
  quantity: number;
  lowStockThreshold: number;
  productId: {
    _id: string;
    name: string;
    sku: string;
    category: string;
    retailPrice: number;
  };
  variantId?: {
    name: string;
    sku: string;
  };
}

interface StockTableProps {
  data: InventoryItem[];
  loading?: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function StockTable({ data, loading, page, totalPages, onPageChange }: StockTableProps) {
  const columns = [
    {
      key: "product",
      label: "Product",
      render: (item: InventoryItem) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">{item.productId?.name}</p>
            <p className="text-xs text-muted-foreground">
              {item.variantId?.sku ?? item.productId?.sku}
              {item.variantId && ` • ${item.variantId.name}`}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (item: InventoryItem) => (
        <span className="text-sm capitalize">{item.productId?.category}</span>
      ),
    },
    {
      key: "stock",
      label: "Stock Level",
      render: (item: InventoryItem) => {
        const pct = Math.min(100, (item.quantity / Math.max(item.lowStockThreshold * 2, 1)) * 100);
        const isLow = item.quantity <= item.lowStockThreshold;
        const isEmpty = item.quantity === 0;
        return (
          <div className="w-32 space-y-1">
            <div className="flex justify-between text-xs">
              <span className={isLow ? "text-red-600 font-medium" : "text-muted-foreground"}>
                {item.quantity} units
              </span>
              {isLow && <AlertTriangle className="h-3 w-3 text-red-500" />}
            </div>
            <Progress
              value={pct}
              className={`h-1.5 ${isEmpty ? "[&>div]:bg-red-500" : isLow ? "[&>div]:bg-yellow-500" : ""}`}
            />
          </div>
        );
      },
    },
    {
      key: "threshold",
      label: "Min. Stock",
      render: (item: InventoryItem) => (
        <span className="text-sm text-muted-foreground">{item.lowStockThreshold}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: InventoryItem) => {
        if (item.quantity === 0) {
          return <Badge variant="destructive">Out of Stock</Badge>;
        }
        if (item.quantity <= item.lowStockThreshold) {
          return <Badge variant="warning">Low Stock</Badge>;
        }
        return <Badge variant="success">In Stock</Badge>;
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      loading={loading}
      keyExtractor={(item) => item._id}
      emptyMessage="No inventory records found."
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
    />
  );
}
