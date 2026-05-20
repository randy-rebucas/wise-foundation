"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/StatCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, PackageCheck, CheckCircle, Eye } from "lucide-react";
import { useFormatCurrency, useFormatDateTime, useFormatDate } from "@/components/providers/TenantProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { OrganizationType } from "@/components/purchase-orders/purchaseOrderFormTypes";

interface DeliveryOrder {
  _id: string;
  poNumber: string;
  title?: string;
  status: "approved" | "received";
  organizationId?: { name: string; type: OrganizationType } | null;
  total: number;
  createdAt: string;
  expectedDeliveryDate?: string;
  approvedAt?: string;
  receivedAt?: string;
}

const STATUS_BADGE: Record<string, "default" | "success"> = {
  approved: "default",
  received: "success",
};

const STATUS_LABEL: Record<string, string> = {
  approved: "To fulfill",
  received: "Fulfilled",
};

export default function DeliveriesPage() {
  const money = useFormatCurrency();
  const dateTime = useFormatDateTime();
  const formatDate = useFormatDate();
  const { data: session } = useSession();
  const isOrgViewer = session?.user?.role === "ORG_ADMIN";
  const canFulfill = session?.user?.permissions?.includes("manage:inventory") ?? false;

  const [statusFilter, setStatusFilter] = useState<"approved" | "received">("approved");
  const [page, setPage] = useState(1);

  const {
    data: listResult,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["deliveries", statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        status: statusFilter,
      });
      const res = await fetch(`/api/deliveries?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load deliveries (${res.status})`);
      return json as {
        data: DeliveryOrder[];
        meta?: {
          total: number;
          statusCounts?: { approved?: number; received?: number };
        };
      };
    },
  });

  const orders: DeliveryOrder[] = listResult?.data ?? [];
  const total = listResult?.meta?.total ?? 0;
  const approvedCount = listResult?.meta?.statusCounts?.approved ?? 0;
  const receivedCount = listResult?.meta?.statusCounts?.received ?? 0;

  const columns = [
    {
      key: "poNumber",
      label: "PO #",
      render: (o: DeliveryOrder) => (
        <div>
          <p className="font-mono font-medium text-sm">{o.poNumber}</p>
          {o.title ? (
            <p className="text-sm font-medium truncate max-w-[14rem]">{o.title}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">{dateTime(o.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "organization",
      label: "Organization",
      render: (o: DeliveryOrder) =>
        o.organizationId ? (
          <div>
            <p className="text-sm font-medium">{o.organizationId.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{o.organizationId.type}</p>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      key: "expectedDelivery",
      label: "Expected",
      render: (o: DeliveryOrder) =>
        o.expectedDeliveryDate ? (
          <span className="text-sm">{formatDate(o.expectedDeliveryDate)}</span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      key: "total",
      label: "Total",
      render: (o: DeliveryOrder) => <span className="font-semibold">{money(o.total)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (o: DeliveryOrder) => (
        <Badge variant={STATUS_BADGE[o.status] ?? "default"} className="w-fit">
          {STATUS_LABEL[o.status] ?? o.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (o: DeliveryOrder) => (
        <div className="flex justify-end gap-1">
          {o.status === "approved" && canFulfill && (
            <Button variant="default" size="sm" className="h-8 text-xs" asChild>
              <Link href={`/purchase-orders/${o._id}`}>
                <PackageCheck className="h-3 w-3 mr-1" />
                Fulfill
              </Link>
            </Button>
          )}
          <Link href={`/purchase-orders/${o._id}`}>
            <Button
              variant="ghost"
              size="icon"
              title="View delivery"
              aria-label="View delivery"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <Header
        title="Deliveries"
        subtitle={
          isOrgViewer
            ? "Approved purchase orders from your organization"
            : "Approved purchase orders ready to pack, ship, and mark as fulfilled"
        }
      />
      <div className="flex-1 space-y-6 p-4 sm:p-6">
        {isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error ? error.message : "Unable to load deliveries."}
            </AlertDescription>
          </Alert>
        )}

        {!isOrgViewer && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" asChild>
              <Link href="/purchase-orders">All purchase orders</Link>
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-2 max-w-xl">
          <StatCard
            title="To fulfill"
            value={approvedCount}
            icon={CheckCircle}
            description="Approved, awaiting shipment"
            iconClassName="bg-blue-100"
          />
          <StatCard
            title="Fulfilled"
            value={receivedCount}
            icon={PackageCheck}
            description="Completed deliveries"
            iconClassName="bg-green-100"
          />
        </div>

        <div className="w-full min-w-0 overflow-x-auto pb-1">
          <Tabs
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as "approved" | "received");
              setPage(1);
            }}
          >
            <TabsList>
              <TabsTrigger value="approved" className="gap-2">
                <Truck className="h-3.5 w-3.5" />
                To fulfill ({approvedCount})
              </TabsTrigger>
              <TabsTrigger value="received" className="gap-2">
                <PackageCheck className="h-3.5 w-3.5" />
                Fulfilled ({receivedCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <DataTable
          columns={columns}
          data={orders}
          loading={isLoading}
          keyExtractor={(o) => o._id}
          emptyMessage={
            statusFilter === "approved"
              ? "No approved purchase orders awaiting fulfillment."
              : "No fulfilled deliveries yet."
          }
          page={page}
          totalPages={Math.ceil(total / 20) || 1}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
