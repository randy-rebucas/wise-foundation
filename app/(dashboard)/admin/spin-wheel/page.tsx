"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

const PAGE_SIZE = 20;

interface SpinEntry {
  _id: string;
  code: string;
  type: "percent" | "fixed" | "free_shipping" | "free_item";
  value: number;
  spinPrizeLabel?: string;
  customerEmail?: string;
  isActive: boolean;
  expiresAt?: string | null;
  redemptions: { redeemedAt: string }[];
  createdAt: string;
}

export default function SpinWheelAdminPage() {
  const [page, setPage] = useState(1);

  const {
    data: listResult,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-spin-wheel", page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/spin-wheel?page=${page}&limit=${PAGE_SIZE}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load entries (${res.status})`);
      return json as { data: SpinEntry[]; meta?: { total?: number } };
    },
  });

  const entries = listResult?.data ?? [];
  const total = listResult?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const columns = [
    {
      key: "email",
      label: "Email",
      render: (e: SpinEntry) => <span className="font-medium">{e.customerEmail ?? "—"}</span>,
    },
    {
      key: "prize",
      label: "Prize",
      render: (e: SpinEntry) => <span>{e.spinPrizeLabel ?? e.type}</span>,
    },
    {
      key: "code",
      label: "Code",
      render: (e: SpinEntry) => <span className="font-mono text-xs">{e.code}</span>,
    },
    {
      key: "redeemed",
      label: "Redeemed",
      render: (e: SpinEntry) => (
        <Badge variant={e.redemptions.length > 0 ? "success" : "secondary"}>
          {e.redemptions.length > 0 ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (e: SpinEntry) => (
        <span className="text-xs text-muted-foreground">{e.createdAt.slice(0, 10)}</span>
      ),
    },
  ];

  return (
    <RoleGuard allowedRoles={["ADMIN"]} requiredPermissions={["manage:promotions"]}>
      <div className="flex flex-col">
        <Header title="Spin Wheel" subtitle="Email captures and prizes from the storefront wheel" />
        <div className="flex-1 space-y-4 p-4 sm:p-6">
          {isError && (
            <ErrorState error={error} fallback="Unable to load spin entries." onRetry={() => refetch()} />
          )}

          <DataTable
            columns={columns}
            data={entries}
            loading={isLoading}
            keyExtractor={(e) => e._id}
            emptyMessage="No one has spun the wheel yet."
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
          {entries.length === 0 && !isLoading && !isError && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Entries appear here once a visitor spins the wheel on the storefront.
            </p>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
