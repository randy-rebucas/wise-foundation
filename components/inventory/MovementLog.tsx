"use client";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { formatDateTime } from "@/lib/utils";
import { ArrowDown, ArrowUp, ArrowLeftRight, Settings } from "lucide-react";

interface StockMovement {
  _id: string;
  type: "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT";
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  productId: { name: string; sku: string };
  performedBy: { name: string };
  fromBranchId?: { name: string; code: string };
  toBranchId?: { name: string; code: string };
  reference?: string;
  notes?: string;
  createdAt: string;
}

const MOVEMENT_CONFIG = {
  IN: { icon: ArrowDown, label: "Stock In", badgeClass: "bg-green-100 text-green-800" },
  OUT: { icon: ArrowUp, label: "Stock Out", badgeClass: "bg-red-100 text-red-800" },
  TRANSFER: { icon: ArrowLeftRight, label: "Transfer", badgeClass: "bg-blue-100 text-blue-800" },
  ADJUSTMENT: { icon: Settings, label: "Adjustment", badgeClass: "bg-yellow-100 text-yellow-800" },
};

interface MovementLogProps {
  data: StockMovement[];
  loading?: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function MovementLog({ data, loading, page, totalPages, onPageChange }: MovementLogProps) {
  const columns = [
    {
      key: "date",
      label: "Date & Time",
      render: (m: StockMovement) => (
        <span className="text-sm text-muted-foreground">{formatDateTime(m.createdAt)}</span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (m: StockMovement) => {
        const config = MOVEMENT_CONFIG[m.type];
        const Icon = config.icon;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.badgeClass}`}
          >
            <Icon className="h-3 w-3" />
            {config.label}
          </span>
        );
      },
    },
    {
      key: "product",
      label: "Product",
      render: (m: StockMovement) => (
        <div>
          <p className="text-sm font-medium">{m.productId?.name}</p>
          <p className="text-xs text-muted-foreground">{m.productId?.sku}</p>
        </div>
      ),
    },
    {
      key: "quantity",
      label: "Quantity",
      render: (m: StockMovement) => (
        <div className="text-sm">
          <span className={m.type === "IN" ? "text-green-600 font-medium" : m.type === "OUT" ? "text-red-600 font-medium" : "font-medium"}>
            {m.type === "IN" ? "+" : m.type === "OUT" ? "-" : ""}
            {m.quantity}
          </span>
          <span className="text-muted-foreground text-xs block">
            {m.previousQuantity} → {m.newQuantity}
          </span>
        </div>
      ),
    },
    {
      key: "branch",
      label: "Branch",
      render: (m: StockMovement) => {
        if (m.type === "TRANSFER") {
          return (
            <span className="text-xs text-muted-foreground">
              {m.fromBranchId?.code ?? "?"} → {m.toBranchId?.code ?? "?"}
            </span>
          );
        }
        return <span className="text-xs text-muted-foreground">{m.reference ?? "—"}</span>;
      },
    },
    {
      key: "performedBy",
      label: "By",
      render: (m: StockMovement) => (
        <span className="text-sm text-muted-foreground">{m.performedBy?.name}</span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      loading={loading}
      keyExtractor={(m) => m._id}
      emptyMessage="No stock movements recorded."
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
    />
  );
}
