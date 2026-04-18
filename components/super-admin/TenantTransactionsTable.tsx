"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface Branch { name: string; code: string }
interface Performer { name: string; email: string }

interface Transaction {
  _id: string;
  type: "SALE" | "REFUND" | "ADJUSTMENT";
  amount: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  branchId: Branch | null;
  performedBy: Performer | null;
  createdAt: string;
}

const TYPE_VARIANT: Record<string, "success" | "destructive" | "secondary"> = {
  SALE: "success",
  REFUND: "destructive",
  ADJUSTMENT: "secondary",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  gcash: "GCash",
  card: "Card",
  bank_transfer: "Bank Transfer",
  credit: "Credit",
};

interface Props {
  tenantId: string;
}

export function TenantTransactionsTable({ tenantId }: Props) {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-transactions", tenantId, page, typeFilter, methodFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (methodFilter !== "all") params.set("paymentMethod", methodFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/super-admin/tenants/${tenantId}/transactions?${params}`);
      const json = await res.json();
      return { transactions: (json.data ?? []) as Transaction[], meta: json.meta };
    },
  });

  const transactions = data?.transactions ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;
  const total = data?.meta?.total ?? 0;

  function resetFilters() {
    setTypeFilter("all");
    setMethodFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const columns = [
    {
      key: "type",
      label: "Type",
      render: (t: Transaction) => (
        <Badge variant={TYPE_VARIANT[t.type] ?? "secondary"}>{t.type}</Badge>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (t: Transaction) => (
        <span className={`font-semibold tabular-nums ${t.type === "REFUND" ? "text-red-600" : "text-foreground"}`}>
          {t.type === "REFUND" ? "−" : ""}
          {formatCurrency(t.amount)}
        </span>
      ),
    },
    {
      key: "paymentMethod",
      label: "Payment Method",
      render: (t: Transaction) => (
        <span className="text-sm">{PAYMENT_LABELS[t.paymentMethod] ?? t.paymentMethod}</span>
      ),
    },
    {
      key: "branch",
      label: "Branch",
      render: (t: Transaction) => (
        <span className="text-sm text-muted-foreground">
          {t.branchId ? `${t.branchId.name} (${t.branchId.code})` : "—"}
        </span>
      ),
    },
    {
      key: "reference",
      label: "Reference",
      render: (t: Transaction) => (
        <span className="text-xs font-mono text-muted-foreground">{t.reference ?? "—"}</span>
      ),
    },
    {
      key: "performedBy",
      label: "By",
      render: (t: Transaction) => (
        <span className="text-sm text-muted-foreground">{t.performedBy?.name ?? "—"}</span>
      ),
    },
    {
      key: "createdAt",
      label: "Date & Time",
      render: (t: Transaction) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="SALE">Sale</SelectItem>
              <SelectItem value="REFUND">Refund</SelectItem>
              <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Payment Method</Label>
          <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="gcash">GCash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            className="h-8 text-sm w-36"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            className="h-8 text-sm w-36"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          />
        </div>

        {(typeFilter !== "all" || methodFilter !== "all" || dateFrom || dateTo) && (
          <button
            onClick={resetFilters}
            className="text-xs text-muted-foreground hover:text-foreground underline mt-5"
          >
            Clear filters
          </button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{total.toLocaleString()} transactions</p>

      <DataTable
        columns={columns}
        data={transactions}
        loading={isLoading}
        keyExtractor={(t) => t._id}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyMessage="No transactions found for this tenant."
      />
    </div>
  );
}
