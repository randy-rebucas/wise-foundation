"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/StatCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  Copy,
  ClipboardCheck,
  Clock,
  CheckCircle,
  PackageCheck,
  Loader2,
  ListChecks,
} from "lucide-react";
import { useFormatCurrency, useFormatDateTime } from "@/components/providers/TenantProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import type { OrganizationType } from "@/components/purchase-orders/purchaseOrderFormTypes";
import {
  purchaseOrderFetchInit,
  purchaseOrderFreshQueryOptions,
  purchaseOrderQueryKeys,
} from "@/lib/purchaseOrders/reactQuery";

interface PurchaseOrder {
  _id: string;
  poNumber: string;
  title?: string;
  status: "draft" | "submitted" | "approved" | "declined" | "received" | "cancelled";
  organizationId?: { name: string; type: OrganizationType } | null;
  subtotal: number;
  total: number;
  createdBy: { name: string };
  createdAt: string;
  expectedDeliveryDate?: string;
}

const STATUS_BADGE: Record<string, "default" | "success" | "secondary" | "destructive" | "warning"> = {
  draft: "secondary",
  submitted: "warning",
  approved: "default",
  declined: "destructive",
  received: "success",
  cancelled: "destructive",
};

const STATUS_NEXT: Record<string, { label: string; value: string } | null> = {
  draft: { label: "Submit", value: "submitted" },
  submitted: { label: "Approve", value: "approved" },
  approved: null,
  declined: null,
  received: null,
  cancelled: null,
};

export default function PurchaseOrdersPage() {
  const money = useFormatCurrency();
  const dateTime = useFormatDateTime();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isPlatformAdmin = session?.user?.role === "ADMIN";
  const isOrgSubmitter = session?.user?.role === "ORG_ADMIN";
  const canFulfillInventory =
    isPlatformAdmin || (session?.user?.permissions?.includes("manage:inventory") ?? false);
  const canReceiveAsOrg = isOrgSubmitter;

  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const {
    data: listResult,
    isLoading,
    isError: isListError,
    error: listError,
  } = useQuery({
    queryKey: [purchaseOrderQueryKeys.list, statusFilter, page],
    ...purchaseOrderFreshQueryOptions,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/purchase-orders?${params}`, purchaseOrderFetchInit);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load purchase orders (${res.status})`);
      return json as {
        data: PurchaseOrder[];
        meta?: {
          total: number;
          statusCounts?: Record<string, number>;
        };
      };
    },
  });

  const orders: PurchaseOrder[] = listResult?.data ?? [];
  const total = listResult?.meta?.total ?? 0;
  const statusCounts = listResult?.meta?.statusCounts ?? {};

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        ...purchaseOrderFetchInit,
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Update failed (${res.status})`);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [purchaseOrderQueryKeys.list] }),
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Status update failed", description: err.message }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const getRes = await fetch(`/api/purchase-orders/${id}`, purchaseOrderFetchInit);
      const getJson = await getRes.json();
      if (!getRes.ok || !getJson.success) {
        throw new Error(getJson.error ?? `Failed to load purchase order (${getRes.status})`);
      }
      const po = getJson.data as {
        organizationId?: string | { _id: string };
        title?: string;
        paymentTermsMonths?: 3 | 6 | "weekly" | null;
        discountPercent?: number;
        expectedDeliveryDate?: string;
        notes?: string;
        items?: Array<{
          productId?: string | { _id: string };
          variantId?: string | { _id: string } | null;
          productName?: string;
          sku?: string;
          quantity?: number;
          unitCost?: number;
        }>;
      };

      const resolveId = (value: string | { _id: string } | null | undefined) => {
        if (!value) return "";
        return typeof value === "object" ? String(value._id) : String(value);
      };

      const organizationId = resolveId(po.organizationId);
      if (!organizationId) throw new Error("Purchase order has no organization");

      const items = (po.items ?? [])
        .map((item) => {
          const productId = resolveId(item.productId);
          if (!productId || !item.productName || !item.sku) return null;
          const variantId = resolveId(item.variantId ?? undefined);
          return {
            productId,
            variantId: variantId || undefined,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity ?? 1,
            unitCost: item.unitCost ?? 0,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (items.length === 0) {
        throw new Error("Purchase order has no line items to duplicate");
      }

      const titleBase = po.title?.trim();
      const title = titleBase ? `${titleBase} (Copy)` : undefined;

      const postRes = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          title,
          items,
          paymentTermsMonths: po.paymentTermsMonths ?? null,
          discountPercent: po.discountPercent,
          expectedDeliveryDate: po.expectedDeliveryDate
            ? new Date(po.expectedDeliveryDate).toISOString().slice(0, 10)
            : undefined,
          notes: po.notes,
        }),
      });
      const postJson = await postRes.json();
      if (!postRes.ok || !postJson.success) {
        throw new Error(postJson.error ?? `Failed to duplicate purchase order (${postRes.status})`);
      }
      return postJson.data as { _id: string; poNumber?: string };
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: [purchaseOrderQueryKeys.list] });
      toast({
        title: "Purchase order duplicated",
        description: created.poNumber
          ? `Draft ${created.poNumber} — you can edit before submitting.`
          : "Opening draft for editing.",
      });
      router.push(`/purchase-orders/${created._id}/edit`);
    },
    onError: (err: Error) =>
      toast({
        variant: "destructive",
        title: "Duplicate failed",
        description: err.message,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        ...purchaseOrderFetchInit,
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Delete failed (${res.status})`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [purchaseOrderQueryKeys.list] });
      toast({ title: "Purchase order deleted" });
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Delete failed", description: err.message }),
  });

  function confirmDeletePurchaseOrder(po: PurchaseOrder) {
    if (!window.confirm(`Delete purchase order ${po.poNumber}? This cannot be undone.`)) {
      return;
    }
    deleteMutation.mutate(po._id);
  }

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) return;
    router.replace(`/purchase-orders/${editId}/edit`);
  }, [searchParams, router]);

  const draftCount = statusCounts.draft ?? 0;
  const submittedCount = statusCounts.submitted ?? 0;
  const approvedCount = statusCounts.approved ?? 0;
  const receivedCount = statusCounts.received ?? 0;

  const columns = [
    {
      key: "poNumber",
      label: "PO #",
      render: (o: PurchaseOrder) => (
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
      render: (o: PurchaseOrder) =>
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
      key: "total",
      label: "Total",
      render: (o: PurchaseOrder) => <span className="font-semibold">{money(o.total)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (o: PurchaseOrder) => {
        const next = STATUS_NEXT[o.status];
        const showSubmit = o.status === "draft" && (isOrgSubmitter || isPlatformAdmin);
        const showApprove = o.status === "submitted" && isPlatformAdmin;
        const showCancelDraft = o.status === "draft";
        const showCancelSubmitted = o.status === "submitted" && isPlatformAdmin;
        return (
          <div className="flex min-w-[8.5rem] flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center">
            <Badge variant={STATUS_BADGE[o.status] ?? "secondary"} className="w-fit">
              {o.status}
            </Badge>
            {showSubmit && (
              <Button variant="outline" size="sm" className="h-6 text-xs" asChild>
                <Link href={`/purchase-orders/${o._id}?sign=submit`}>Sign & Submit</Link>
              </Button>
            )}
            {showApprove && (
              <Button variant="outline" size="sm" className="h-6 text-xs" asChild>
                <Link href={`/purchase-orders/${o._id}?sign=approve`}>Sign & Approve</Link>
              </Button>
            )}
            {next &&
              !showSubmit &&
              !showApprove &&
              o.status === "approved" &&
              (canFulfillInventory || canReceiveAsOrg) && (
                <Button variant="outline" size="sm" className="h-6 text-xs" asChild>
                  <Link href={`/purchase-orders/${o._id}`}>
                    {canReceiveAsOrg && !canFulfillInventory ? "Confirm delivery" : "Fulfill"}
                  </Link>
                </Button>
              )}
            {(showCancelDraft || showCancelSubmitted) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-destructive"
                onClick={() => statusMutation.mutate({ id: o._id, status: "cancelled" })}
                disabled={statusMutation.isPending}
              >
                Cancel
              </Button>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "",
      render: (o: PurchaseOrder) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="Duplicate as new draft"
            aria-label="Duplicate as new draft"
            disabled={duplicateMutation.isPending}
            onClick={() => duplicateMutation.mutate(o._id)}
          >
            {duplicateMutation.isPending && duplicateMutation.variables === o._id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          {o.status === "draft" && (
            <>
              <Button variant="ghost" size="icon" title="Edit purchase order" asChild>
                <Link href={`/purchase-orders/${o._id}/edit`} aria-label="Edit purchase order">
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                title="Delete purchase order"
                aria-label="Delete purchase order"
                disabled={deleteMutation.isPending}
                onClick={() => confirmDeletePurchaseOrder(o)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          <Link href={`/purchase-orders/${o._id}`}>
            <Button
              variant="ghost"
              size="icon"
              title="View purchase order"
              aria-label="View purchase order"
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
        title={isOrgSubmitter ? "My Purchase Orders" : "Purchase Orders"}
        subtitle={
          isOrgSubmitter
            ? "Create and submit purchase orders for admin approval"
            : "Manage draft, submitted, and approved orders from distributors and partners"
        }
      />
      <div className="flex-1 space-y-6 p-4 sm:p-6">
        {isListError && (
          <Alert variant="destructive">
            <AlertDescription>
              {listError instanceof Error ? listError.message : "Unable to load purchase orders."}
            </AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" asChild>
            <Link href="/purchase-orders/new?template=catalog">
              <ListChecks className="h-4 w-4 mr-2" />
              Catalog template
            </Link>
          </Button>
          <Button asChild>
            <Link href="/purchase-orders/new">
              <Plus className="h-4 w-4 mr-2" />
              New PO
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            title="Draft"
            value={draftCount}
            icon={ClipboardCheck}
            description="Pending submission"
            iconClassName="bg-gray-100"
          />
          <StatCard
            title="Submitted"
            value={submittedCount}
            icon={Clock}
            description="Awaiting approval"
            iconClassName="bg-yellow-100"
          />
          <StatCard
            title="Approved"
            value={approvedCount}
            icon={CheckCircle}
            description="Ready to fulfill"
            iconClassName="bg-blue-100"
          />
          <StatCard
            title="Received"
            value={receivedCount}
            icon={PackageCheck}
            description="Fulfilled"
            iconClassName="bg-green-100"
          />
        </div>

        <div className="w-full min-w-0 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
          <Tabs
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <TabsList className="inline-flex h-auto w-max min-w-full flex-wrap justify-start gap-1 p-1 sm:h-10 sm:w-auto sm:flex-nowrap">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                All
              </TabsTrigger>
              <TabsTrigger value="draft" className="text-xs sm:text-sm">
                Draft
              </TabsTrigger>
              <TabsTrigger value="submitted" className="text-xs sm:text-sm">
                Submitted
              </TabsTrigger>
              <TabsTrigger value="approved" className="text-xs sm:text-sm">
                Approved
              </TabsTrigger>
              <TabsTrigger value="received" className="text-xs sm:text-sm">
                Received
              </TabsTrigger>
              <TabsTrigger value="declined" className="text-xs sm:text-sm">
                Declined
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="text-xs sm:text-sm">
                Cancelled
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <DataTable
          columns={columns}
          data={orders}
          loading={isLoading}
          keyExtractor={(o) => o._id}
          emptyMessage="No purchase orders found."
          page={page}
          totalPages={Math.ceil(total / 20)}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
