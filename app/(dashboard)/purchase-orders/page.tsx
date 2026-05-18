"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/StatCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingBag,
  Plus,
  Eye,
  Pencil,
  Trash2,
  ClipboardCheck,
  Clock,
  CheckCircle,
  PackageCheck,
} from "lucide-react";
import { useFormatCurrency, useFormatDateTime } from "@/components/providers/TenantProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { PurchaseOrderForm } from "@/components/purchase-orders/PurchaseOrderForm";
import type { OrganizationType } from "@/components/purchase-orders/purchaseOrderFormTypes";

interface PurchaseOrder {
  _id: string;
  poNumber: string;
  status: "draft" | "submitted" | "approved" | "received" | "cancelled";
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
  received: "success",
  cancelled: "destructive",
};

const STATUS_NEXT: Record<string, { label: string; value: string } | null> = {
  draft: { label: "Submit", value: "submitted" },
  submitted: { label: "Approve", value: "approved" },
  approved: null,
  received: null,
  cancelled: null,
};

export default function PurchaseOrdersPage() {
  const money = useFormatCurrency();
  const dateTime = useFormatDateTime();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [editingPoId, setEditingPoId] = useState<string | null>(null);
  const [editingPoNumber, setEditingPoNumber] = useState("");

  const {
    data: listResult,
    isLoading,
    isError: isListError,
    error: listError,
  } = useQuery({
    queryKey: ["purchase-orders", statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/purchase-orders?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load purchase orders (${res.status})`);
      return json as { data: PurchaseOrder[]; meta?: { total: number } };
    },
  });

  const orders: PurchaseOrder[] = listResult?.data ?? [];
  const total = listResult?.meta?.total ?? 0;

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Update failed (${res.status})`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }),
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Status update failed", description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/purchase-orders/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Delete failed (${res.status})`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
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

  function closeEdit() {
    setEditOpen(false);
    setEditingPoId(null);
    setEditingPoNumber("");
  }

  const openEdit = useCallback((poId: string, poNumber?: string) => {
    setEditingPoId(poId);
    setEditingPoNumber(poNumber ?? "");
    setEditOpen(true);
  }, []);

  const editFromUrlHandled = useRef(false);
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || editFromUrlHandled.current) return;
    editFromUrlHandled.current = true;
    openEdit(editId);
    router.replace("/purchase-orders");
  }, [searchParams, openEdit, router]);

  const draftCount = orders.filter((o) => o.status === "draft").length;
  const submittedCount = orders.filter((o) => o.status === "submitted").length;
  const approvedCount = orders.filter((o) => o.status === "approved").length;
  const receivedCount = orders.filter((o) => o.status === "received").length;

  const columns = [
    {
      key: "poNumber",
      label: "PO #",
      render: (o: PurchaseOrder) => (
        <div>
          <p className="font-mono font-medium text-sm">{o.poNumber}</p>
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
        return (
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_BADGE[o.status] ?? "secondary"}>{o.status}</Badge>
            {next &&
              (o.status === "draft" || o.status === "submitted" ? (
                <Button variant="outline" size="sm" className="h-6 text-xs" asChild>
                  <Link
                    href={`/purchase-orders/${o._id}?sign=${o.status === "draft" ? "submit" : "approve"}`}
                  >
                    {o.status === "draft" ? "Sign & Submit" : "Sign & Approve"}
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => statusMutation.mutate({ id: o._id, status: next.value })}
                  disabled={statusMutation.isPending}
                >
                  {next.label}
                </Button>
              ))}
            {(o.status === "draft" || o.status === "submitted") && (
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
          {o.status === "draft" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                title="Edit purchase order"
                aria-label="Edit purchase order"
                onClick={() => openEdit(o._id, o.poNumber)}
              >
                <Pencil className="h-4 w-4" />
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
      <Header title="Purchase Orders" subtitle="Manage orders from distributors, franchises, and partners" />
      <div className="flex-1 p-6 space-y-6">
        {isListError && (
          <Alert variant="destructive">
            <AlertDescription>
              {listError instanceof Error ? listError.message : "Unable to load purchase orders."}
            </AlertDescription>
          </Alert>
        )}
        <div className="flex justify-end">
          <Button asChild>
            <Link href="/purchase-orders/new">
              <Plus className="h-4 w-4 mr-2" />
              New PO
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
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

        <Tabs
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="submitted">Submitted</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="received">Received</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

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

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
      >
        <DialogContent className="max-w-2xl overflow-y-visible sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Edit {editingPoNumber || "Purchase Order"}
            </DialogTitle>
          </DialogHeader>
          {editingPoId ? (
            <PurchaseOrderForm
              key={editingPoId}
              mode="edit"
              poId={editingPoId}
              onCancel={closeEdit}
              onSuccess={() => {
                closeEdit();
                toast({ title: "Purchase order updated" });
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
