"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  PackageCheck,
  CheckCircle,
  XCircle,
  Loader2,
  Pencil,
  Trash2,
  FileDown,
  PenLine,
} from "lucide-react";
import { PurchaseOrderSignDialog } from "@/components/purchase-orders/PurchaseOrderSignDialog";
import { PurchaseOrderReceiveDialog } from "@/components/purchase-orders/PurchaseOrderReceiveDialog";
import { canReceivePurchaseOrder } from "@/lib/permissions/purchaseOrders";
import type { SessionUser } from "@/types";
import { downloadPurchaseOrderPdf } from "@/lib/client/purchaseOrderPdf";
import type { PurchaseOrderSignRole } from "@/lib/types/purchaseOrderSignature";
import { useFormatCurrency, useFormatDate, useFormatDateTime } from "@/components/providers/TenantProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { formatPurchaseOrderPaymentTerms } from "@/lib/utils/purchaseOrderTotals";
import { PaymentTermsSchedulePanel } from "@/components/purchase-orders/PaymentTermsSchedulePanel";
import {
  purchaseOrderFetchInit,
  purchaseOrderFreshQueryOptions,
  purchaseOrderQueryKeys,
} from "@/lib/purchaseOrders/reactQuery";

type OrganizationType = "distributor" | "franchise" | "partner" | "headquarters";

interface POItemDetail {
  _id: string;
  productName: string;
  sku: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  total: number;
  productId?: { name: string; images?: string[] };
}

interface PurchaseOrderDetail {
  _id: string;
  poNumber: string;
  title?: string;
  branchId?: string | { _id: string; name?: string } | null;
  status: "draft" | "submitted" | "approved" | "declined" | "received" | "cancelled";
  organizationId?: {
    name: string;
    type: OrganizationType;
    contactPerson?: string;
    email?: string;
    phone?: string;
  } | null;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  paymentTermsMonths?: 3 | 6 | "weekly" | null;
  expectedDeliveryDate?: string;
  notes?: string;
  createdBy: { name: string };
  approvedBy?: { name: string } | null;
  declinedBy?: { name: string } | null;
  receivedBy?: { name: string } | null;
  approvedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  receivedAt?: string;
  createdAt: string;
  submittedSignature?: {
    name: string;
    signedAt: string;
    imageDataUrl: string;
  } | null;
  approvedSignature?: {
    name: string;
    signedAt: string;
    imageDataUrl: string;
  } | null;
  receivedSignature?: {
    name: string;
    signedAt: string;
    imageDataUrl: string;
  } | null;
  items: POItemDetail[];
  auditLogs?: {
    _id: string;
    action: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    performedByName?: string | null;
    metadata?: { reason?: string } | null;
    createdAt: string;
  }[];
}

const AUDIT_ACTION_LABEL: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  submitted: "Submitted for approval",
  approved: "Approved",
  declined: "Declined",
  cancelled: "Cancelled",
  received: "Received with signature",
  status_changed: "Status changed",
};

const STATUS_BADGE: Record<string, "default" | "success" | "secondary" | "destructive" | "warning"> = {
  draft: "secondary",
  submitted: "warning",
  approved: "default",
  declined: "destructive",
  received: "success",
  cancelled: "destructive",
};

const STATUS_LABEL: Record<PurchaseOrderDetail["status"], string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  declined: "Declined",
  received: "Fulfilled",
  cancelled: "Cancelled",
};

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm leading-snug">{children}</div>
    </div>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-4xl px-4 pb-8 sm:px-6">{children}</div>;
}

function sessionUserFromSession(session: ReturnType<typeof useSession>["data"]): SessionUser | null {
  const u = session?.user;
  if (!u?.id) return null;
  return {
    id: u.id,
    name: u.name ?? "",
    email: u.email ?? "",
    role: u.role as SessionUser["role"],
    branchIds: u.branchIds ?? [],
    organizationId: u.organizationId,
    organizationType: u.organizationType,
    organizationCapabilities: u.organizationCapabilities,
    permissions: u.permissions ?? [],
    image: u.image,
  };
}

export default function PurchaseOrderDetailPage() {
  const money = useFormatCurrency();
  const formatDate = useFormatDate();
  const dateTime = useFormatDateTime();
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: session } = useSession();
  const isPlatformAdmin = session?.user?.role === "ADMIN";
  const isOrgSubmitter = session?.user?.role === "ORG_ADMIN";
  const sessionUser = sessionUserFromSession(session);

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [signOpen, setSignOpen] = useState(false);
  const [signRole, setSignRole] = useState<PurchaseOrderSignRole>("submit");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [discountDraft, setDiscountDraft] = useState(0);

  useEffect(() => {
    const sign = searchParams.get("sign");
    if (sign !== "submit" && sign !== "approve") return;
    queueMicrotask(() => {
      setSignRole(sign);
      setSignOpen(true);
      router.replace(`/purchase-orders/${id}`);
    });
  }, [searchParams, id, router]);

  function openSign(role: PurchaseOrderSignRole) {
    setSignRole(role);
    setSignOpen(true);
  }

  async function handleDownloadPdf() {
    if (!po) return;
    setPdfLoading(true);
    try {
      await downloadPurchaseOrderPdf(id, po.poNumber);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "PDF download failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setPdfLoading(false);
    }
  }

  const { data: po, isLoading, isError, error } = useQuery({
    queryKey: [purchaseOrderQueryKeys.detail, id],
    enabled: !!id,
    ...purchaseOrderFreshQueryOptions,
    queryFn: async () => {
      const res = await fetch(`/api/purchase-orders/${id}`, purchaseOrderFetchInit);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load purchase order (${res.status})`);
      return json.data as PurchaseOrderDetail;
    },
  });

  useEffect(() => {
    if (po) setDiscountDraft(Number(po.discountPercent ?? 0));
  }, [po]);

  const discountMutation = useMutation({
    mutationFn: async (discountPercent: number) => {
      const res = await fetch(`/api/purchase-orders/${id}/discount`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountPercent }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Update failed (${res.status})`);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: [purchaseOrderQueryKeys.detail, id] });
      await queryClient.refetchQueries({ queryKey: [purchaseOrderQueryKeys.list] });
      toast({ title: "Discount updated" });
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Discount update failed", description: err.message }),
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Update failed (${res.status})`);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: [purchaseOrderQueryKeys.detail, id] });
      await queryClient.refetchQueries({ queryKey: [purchaseOrderQueryKeys.list] });
      await queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Update failed", description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/purchase-orders/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Delete failed (${res.status})`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [purchaseOrderQueryKeys.list] });
      toast({ title: "Purchase order deleted" });
      router.push("/purchase-orders");
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Delete failed", description: err.message }),
  });

  const declineMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await fetch(`/api/purchase-orders/${id}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Decline failed (${res.status})`);
    },
    onSuccess: async () => {
      setDeclineOpen(false);
      setDeclineReason("");
      await queryClient.refetchQueries({ queryKey: [purchaseOrderQueryKeys.detail, id] });
      await queryClient.refetchQueries({ queryKey: [purchaseOrderQueryKeys.list] });
      await queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      toast({ title: "Purchase order declined" });
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Decline failed", description: err.message }),
  });

  async function handleReceiveSuccess() {
    await queryClient.refetchQueries({ queryKey: [purchaseOrderQueryKeys.detail, id] });
    await queryClient.refetchQueries({ queryKey: [purchaseOrderQueryKeys.list] });
    await queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    toast({
      title: po?.branchId ? "Purchase order fulfilled" : "Delivery confirmed",
      description: "Inventory has been updated.",
    });
  }

  const canReceive =
    !!po &&
    !!sessionUser &&
    po.status === "approved" &&
    canReceivePurchaseOrder(sessionUser, po);
  const isBranchPo = !!po?.branchId;

  if (!id) {
    return (
      <div className="flex flex-col">
        <Header title="Purchase Order" />
        <PageShell>
          <p className="mt-6 text-muted-foreground">Invalid purchase order link.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/purchase-orders")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
        </PageShell>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Header title="Purchase Order" />
        <PageShell>
          <div className="flex h-48 items-center justify-center sm:h-64">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </PageShell>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col">
        <Header title="Purchase Order" />
        <PageShell>
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>
              {error instanceof Error ? error.message : "Unable to load this purchase order."}
            </AlertDescription>
          </Alert>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/purchase-orders")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
        </PageShell>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="flex flex-col">
        <Header title="Purchase Order" />
        <PageShell>
          <p className="mt-6 text-muted-foreground">Purchase order not found.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/purchase-orders")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
        </PageShell>
      </div>
    );
  }

  const itemCount = po.items.length;
  const showFulfilledColumn = po.status === "received";

  return (
    <div className="flex flex-col">
      <Header
        title={po.title?.trim() ? po.title.trim() : po.poNumber}
        subtitle={
          [
            po.title?.trim() ? po.poNumber : null,
            po.organizationId?.name,
            po.organizationId?.type
              ? po.organizationId.type.charAt(0).toUpperCase() + po.organizationId.type.slice(1)
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined
        }
      />

      <div className="border-b bg-muted/30 px-4 sm:px-6">
        <div className="flex flex-col gap-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 w-fit"
            onClick={() => router.push("/purchase-orders")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <Badge variant={STATUS_BADGE[po.status] ?? "secondary"} className="text-sm">
                {STATUS_LABEL[po.status]}
              </Badge>
              <span className="font-mono text-sm text-muted-foreground">{po.poNumber}</span>
              <span className="text-sm text-muted-foreground">
                {itemCount} {itemCount === 1 ? "item" : "items"} · {money(po.total)}
              </span>
            </div>

            <div className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:max-w-[70%] lg:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleDownloadPdf()}
                disabled={pdfLoading}
              >
                {pdfLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                PDF
              </Button>

              {po.status === "draft" && (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/purchase-orders/${id}/edit`}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Link>
                  </Button>
                  {(isOrgSubmitter || isPlatformAdmin) && (
                    <Button size="sm" onClick={() => openSign("submit")}>
                      <PenLine className="h-4 w-4 mr-2" />
                      Sign & Submit
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => statusMutation.mutate("cancelled")}
                    disabled={statusMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Delete purchase order ${po.poNumber}? This cannot be undone.`
                        )
                      ) {
                        return;
                      }
                      deleteMutation.mutate();
                    }}
                    disabled={deleteMutation.isPending || statusMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}
              {po.status === "submitted" && isPlatformAdmin && (
                <>
                  <Button size="sm" onClick={() => openSign("approve")}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeclineOpen(true)}
                    disabled={declineMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Decline
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => statusMutation.mutate("cancelled")}
                    disabled={statusMutation.isPending}
                  >
                    Cancel
                  </Button>
                </>
              )}
              {canReceive && (
                <Button size="sm" onClick={() => setReceiveOpen(true)}>
                  <PackageCheck className="h-4 w-4 mr-2" />
                  {isBranchPo ? "Mark fulfilled" : "Confirm delivery"}
                </Button>
              )}
              {po.status === "declined" && (isOrgSubmitter || isPlatformAdmin) && (
                <Button size="sm" asChild>
                  <Link href="/purchase-orders/new">New PO</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <PageShell>
        <div className="mt-6 space-y-6">
          {po.status === "declined" && (
            <Alert variant="destructive">
              <AlertDescription>
                <span className="font-medium">This order was declined.</span>
                {po.declineReason ? (
                  <span className="block mt-1">{po.declineReason}</span>
                ) : (
                  <span className="block mt-1 text-destructive/90">
                    Contact your administrator for details.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {po.status === "submitted" && isOrgSubmitter && (
            <Alert>
              <AlertDescription>
                Waiting for platform admin approval. You will be notified when this order is
                approved or declined.
              </AlertDescription>
            </Alert>
          )}

          {isPlatformAdmin &&
            (po.status === "submitted" || po.status === "draft") && (
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium">Order discount</p>
                  <p className="text-xs text-muted-foreground">
                    Override the organization-type default before approval. Recalculates order
                    total.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="space-y-2 flex-1 max-w-[12rem]">
                    <Label htmlFor="po-admin-discount">Discount (%)</Label>
                    <Input
                      id="po-admin-discount"
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={discountDraft}
                      onChange={(e) => {
                        const n = parseFloat(e.target.value);
                        setDiscountDraft(Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0);
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      discountMutation.isPending ||
                      discountDraft === Number(po.discountPercent ?? 0)
                    }
                    onClick={() => discountMutation.mutate(discountDraft)}
                  >
                    {discountMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Apply discount
                  </Button>
                </div>
              </div>
            )}

          {(po.submittedSignature || po.approvedSignature || po.receivedSignature) && (
            <div className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
              {po.submittedSignature ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Submitted signature
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={po.submittedSignature.imageDataUrl}
                    alt={`Signature of ${po.submittedSignature.name}`}
                    className="h-16 max-w-full object-contain rounded border bg-white"
                  />
                  <p className="text-sm font-medium">{po.submittedSignature.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {dateTime(po.submittedSignature.signedAt)}
                  </p>
                </div>
              ) : null}
              {po.approvedSignature ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Approved signature
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={po.approvedSignature.imageDataUrl}
                    alt={`Signature of ${po.approvedSignature.name}`}
                    className="h-16 max-w-full object-contain rounded border bg-white"
                  />
                  <p className="text-sm font-medium">{po.approvedSignature.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {dateTime(po.approvedSignature.signedAt)}
                  </p>
                </div>
              ) : null}
              {po.receivedSignature ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Received signature
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={po.receivedSignature.imageDataUrl}
                    alt={`Signature of ${po.receivedSignature.name}`}
                    className="h-16 max-w-full object-contain rounded border bg-white"
                  />
                  <p className="text-sm font-medium">{po.receivedSignature.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {dateTime(po.receivedSignature.signedAt)}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          <section className="rounded-lg border bg-card p-4 sm:p-5">
            <h2 className="mb-4 text-sm font-semibold">Order details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {po.organizationId && (
                <DetailField label="Organization">
                  <p className="font-medium">{po.organizationId.name}</p>
                  <p className="text-muted-foreground capitalize">{po.organizationId.type}</p>
                  {po.organizationId.contactPerson ? (
                    <p className="text-muted-foreground">{po.organizationId.contactPerson}</p>
                  ) : null}
                  {po.organizationId.email ? (
                    <p className="text-muted-foreground">{po.organizationId.email}</p>
                  ) : null}
                </DetailField>
              )}
              <DetailField label="Created by">
                <p className="font-medium">{po.createdBy?.name ?? "—"}</p>
                <p className="text-muted-foreground">{dateTime(po.createdAt)}</p>
              </DetailField>
              {po.expectedDeliveryDate ? (
                <DetailField label="Expected delivery">
                  <p className="font-medium">{formatDate(po.expectedDeliveryDate)}</p>
                </DetailField>
              ) : null}
              {formatPurchaseOrderPaymentTerms(po.paymentTermsMonths) ? (
                <DetailField label="Payment terms">
                  <p className="font-medium">
                    {formatPurchaseOrderPaymentTerms(po.paymentTermsMonths)}
                  </p>
                </DetailField>
              ) : null}
              {(po.discountPercent ?? 0) > 0 ? (
                <DetailField label="Discount">
                  <p className="font-medium text-green-600">{po.discountPercent}% off</p>
                </DetailField>
              ) : null}
              {po.approvedBy ? (
                <DetailField label="Approved by">
                  <p className="font-medium">{po.approvedBy.name}</p>
                  {po.approvedAt ? (
                    <p className="text-muted-foreground">{dateTime(po.approvedAt)}</p>
                  ) : null}
                </DetailField>
              ) : null}
              {po.declinedBy ? (
                <DetailField label="Declined by">
                  <p className="font-medium">{po.declinedBy.name}</p>
                  {po.declinedAt ? (
                    <p className="text-muted-foreground">{dateTime(po.declinedAt)}</p>
                  ) : null}
                </DetailField>
              ) : null}
              {po.receivedSignature || po.receivedBy ? (
                <DetailField label={po.receivedSignature ? "Received by" : "Fulfilled by"}>
                  <p className="font-medium">
                    {po.receivedSignature?.name ?? po.receivedBy?.name}
                  </p>
                  {po.receivedAt ? (
                    <p className="text-muted-foreground">{dateTime(po.receivedAt)}</p>
                  ) : null}
                </DetailField>
              ) : null}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold">
                Line items
                <span className="ml-2 font-normal text-muted-foreground">({itemCount})</span>
              </h2>
            </div>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full min-w-[32rem] text-sm">
                <thead className="border-b bg-muted/60">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Product</th>
                    <th className="px-4 py-2.5 text-right font-medium">Qty</th>
                    {showFulfilledColumn ? (
                      <th className="px-4 py-2.5 text-right font-medium">Fulfilled</th>
                    ) : null}
                    <th className="px-4 py-2.5 text-right font-medium">Unit cost</th>
                    <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {po.items.map((item) => (
                    <tr key={item._id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
                      {showFulfilledColumn ? (
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className="font-medium text-green-600">{item.receivedQuantity}</span>
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-right tabular-nums">{money(item.unitCost)}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {money(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/40">
                  <tr>
                    <td
                      colSpan={showFulfilledColumn ? 4 : 3}
                      className="px-4 py-2 text-right text-muted-foreground"
                    >
                      Subtotal
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(po.subtotal)}</td>
                  </tr>
                  {(po.discountAmount ?? 0) > 0 && (
                    <tr>
                      <td
                        colSpan={showFulfilledColumn ? 4 : 3}
                        className="px-4 py-2 text-right text-green-600"
                      >
                        Discount ({po.discountPercent}%)
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-green-600 tabular-nums">
                        −{money(po.discountAmount)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td
                      colSpan={showFulfilledColumn ? 4 : 3}
                      className="px-4 py-2.5 text-right font-semibold"
                    >
                      Total
                    </td>
                    <td className="px-4 py-2.5 text-right text-base font-bold tabular-nums">
                      {money(po.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <PaymentTermsSchedulePanel
            total={po.total}
            paymentTermsMonths={po.paymentTermsMonths}
            termsStartDate={po.createdAt}
            formatMoney={money}
            formatDate={formatDate}
          />

          {po.notes ? (
            <section className="rounded-lg border bg-card p-4 sm:p-5">
              <h2 className="mb-2 text-sm font-semibold">Notes</h2>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{po.notes}</p>
            </section>
          ) : null}

          {(po.auditLogs?.length ?? 0) > 0 && (
            <section className="rounded-lg border bg-card p-4 sm:p-5">
              <h2 className="mb-3 text-sm font-semibold">Activity</h2>
              <ul className="space-y-3">
                {[...(po.auditLogs ?? [])].reverse().map((entry) => (
                  <li
                    key={entry._id}
                    className="flex flex-col gap-0.5 border-b border-border/60 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {AUDIT_ACTION_LABEL[entry.action] ?? entry.action}
                        {entry.fromStatus && entry.toStatus && entry.fromStatus !== entry.toStatus ? (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            ({STATUS_LABEL[entry.fromStatus as PurchaseOrderDetail["status"]] ??
                              entry.fromStatus}{" "}
                            →{" "}
                            {STATUS_LABEL[entry.toStatus as PurchaseOrderDetail["status"]] ??
                              entry.toStatus})
                          </span>
                        ) : null}
                      </p>
                      {entry.metadata?.reason ? (
                        <p className="text-xs text-muted-foreground">{entry.metadata.reason}</p>
                      ) : null}
                      {entry.performedByName ? (
                        <p className="text-xs text-muted-foreground">{entry.performedByName}</p>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">
                      {dateTime(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </PageShell>

      <PurchaseOrderReceiveDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        poId={id}
        poNumber={po.poNumber}
        organizationName={po.organizationId?.name}
        items={po.items}
        isBranchPo={isBranchPo}
        onSuccess={handleReceiveSuccess}
      />

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Decline — {po.poNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The distributor will see this order as declined. You can add an optional reason.
            </p>
            <div className="space-y-1">
              <Label htmlFor="decline-reason">Reason (optional)</Label>
              <textarea
                id="decline-reason"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={declineReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setDeclineReason(e.target.value)
                }
                placeholder="e.g. Out of stock for requested quantities"
                maxLength={500}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => declineMutation.mutate(declineReason)}
              disabled={declineMutation.isPending}
            >
              {declineMutation.isPending ? "Declining..." : "Decline order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PurchaseOrderSignDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        poId={id}
        poNumber={po.poNumber}
        role={signRole}
        onSuccess={async () => {
          await queryClient.refetchQueries({ queryKey: [purchaseOrderQueryKeys.detail, id] });
          await queryClient.refetchQueries({ queryKey: [purchaseOrderQueryKeys.list] });
          await queryClient.invalidateQueries({ queryKey: ["deliveries"] });
          toast({
            title: signRole === "submit" ? "Purchase order submitted" : "Purchase order approved",
          });
        }}
      />
    </div>
  );
}
