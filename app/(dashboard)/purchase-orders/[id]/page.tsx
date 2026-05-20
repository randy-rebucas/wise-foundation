"use client";

import { useEffect, useState } from "react";
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
  Copy,
} from "lucide-react";
import { PurchaseOrderSignDialog } from "@/components/purchase-orders/PurchaseOrderSignDialog";
import { downloadPurchaseOrderPdf } from "@/lib/client/purchaseOrderPdf";
import type { PurchaseOrderSignRole } from "@/lib/types/purchaseOrderSignature";
import { useFormatCurrency, useFormatDate, useFormatDateTime } from "@/components/providers/TenantProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { formatPurchaseOrderPaymentTerms } from "@/lib/utils/purchaseOrderTotals";
import { PaymentTermsSchedulePanel } from "@/components/purchase-orders/PaymentTermsSchedulePanel";

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
  status: "draft" | "submitted" | "approved" | "received" | "cancelled";
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
  paymentTermsMonths?: 3 | 6 | null;
  expectedDeliveryDate?: string;
  notes?: string;
  createdBy: { name: string };
  approvedBy?: { name: string } | null;
  receivedBy?: { name: string } | null;
  approvedAt?: string;
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
  items: POItemDetail[];
}

const STATUS_BADGE: Record<string, "default" | "success" | "secondary" | "destructive" | "warning"> = {
  draft: "secondary",
  submitted: "warning",
  approved: "default",
  received: "success",
  cancelled: "destructive",
};

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

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});
  const [signOpen, setSignOpen] = useState(false);
  const [signRole, setSignRole] = useState<PurchaseOrderSignRole>("submit");
  const [pdfLoading, setPdfLoading] = useState(false);

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
    queryKey: ["purchase-order", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/purchase-orders/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? `Failed to load purchase order (${res.status})`);
      return json.data as PurchaseOrderDetail;
    },
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase-order", id] }),
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
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: "Purchase order deleted" });
      router.push("/purchase-orders");
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Delete failed", description: err.message }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/purchase-orders/${id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Duplicate failed (${res.status})`);
      return data.data as { _id: string; poNumber?: string };
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({
        title: "Purchase order duplicated",
        description: created.poNumber ? `Draft ${created.poNumber} created` : undefined,
      });
      router.push(`/purchase-orders/${created._id}/edit`);
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Duplicate failed", description: err.message }),
  });

  const receiveMutation = useMutation({
    mutationFn: async () => {
      if (!po) return;
      const items = po.items.map((item) => ({
        itemId: item._id,
        receivedQuantity: receivedQtys[item._id] ?? item.quantity,
      }));
      const res = await fetch(`/api/purchase-orders/${id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? `Receive failed (${res.status})`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-order", id] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setReceiveOpen(false);
    },
    onError: (err: Error) =>
      toast({ variant: "destructive", title: "Fulfillment failed", description: err.message }),
  });

  function openReceive() {
    if (!po) return;
    const defaults: Record<string, number> = {};
    po.items.forEach((item) => { defaults[item._id] = item.quantity; });
    setReceivedQtys(defaults);
    setReceiveOpen(true);
  }

  if (!id) {
    return (
      <div className="flex flex-col">
        <Header title="Purchase Order" />
        <div className="flex-1 p-6 space-y-4">
          <p className="text-muted-foreground">Invalid purchase order link.</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/purchase-orders")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Header title="Purchase Order" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col">
        <Header title="Purchase Order" />
        <div className="flex-1 p-6 space-y-4 max-w-4xl">
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error ? error.message : "Unable to load this purchase order."}
            </AlertDescription>
          </Alert>
          <Button variant="outline" size="sm" onClick={() => router.push("/purchase-orders")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="flex flex-col">
        <Header title="Purchase Order" />
        <div className="flex-1 p-6">
          <p className="text-muted-foreground">Purchase order not found.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/purchase-orders")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header
        title={po.title?.trim() ? po.title.trim() : `PO: ${po.poNumber}`}
        subtitle={
          [
            po.title?.trim() ? `PO: ${po.poNumber}` : null,
            po.organizationId ? `${po.organizationId.name} · ${po.organizationId.type}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined
        }
      />
      <div className="flex-1 space-y-6 p-4 sm:p-6 max-w-4xl">
        {/* Back + Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <Button variant="ghost" size="sm" className="w-fit shrink-0" onClick={() => router.push("/purchase-orders")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
          <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:justify-end">
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
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => duplicateMutation.mutate()}
              disabled={duplicateMutation.isPending}
            >
              {duplicateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Duplicate
            </Button>
            <Badge variant={STATUS_BADGE[po.status] ?? "secondary"} className="text-sm px-3 py-1">
              {po.status.toUpperCase()}
            </Badge>
            {po.status === "draft" && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/purchase-orders/${id}/edit`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </Button>
                <Button size="sm" onClick={() => openSign("submit")}>
                  <PenLine className="h-4 w-4 mr-2" />
                  Sign & Submit
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
                <Button variant="outline" size="sm" onClick={() => statusMutation.mutate("cancelled")} disabled={statusMutation.isPending}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
            {po.status === "submitted" && (
              <>
                <Button size="sm" onClick={() => openSign("approve")}>
                  <PenLine className="h-4 w-4 mr-2" />
                  Sign & Approve
                </Button>
                <Button variant="destructive" size="sm" onClick={() => statusMutation.mutate("cancelled")} disabled={statusMutation.isPending}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
            {po.status === "approved" && (
              <Button size="sm" onClick={openReceive}>
                <PackageCheck className="h-4 w-4 mr-2" />
                Mark Fulfilled
              </Button>
            )}
          </div>
        </div>

        {(po.submittedSignature || po.approvedSignature) && (
          <div className="grid gap-4 sm:grid-cols-2 border rounded-lg p-4">
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
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border rounded-lg p-4">
          {po.organizationId && (
            <div>
              <p className="text-xs text-muted-foreground">Organization</p>
              <p className="text-sm font-medium">{po.organizationId.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{po.organizationId.type}</p>
              {po.organizationId.contactPerson && (
                <p className="text-xs text-muted-foreground">{po.organizationId.contactPerson}</p>
              )}
              {po.organizationId.email && (
                <p className="text-xs text-muted-foreground">{po.organizationId.email}</p>
              )}
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Created By</p>
            <p className="text-sm font-medium">{po.createdBy?.name}</p>
            <p className="text-xs text-muted-foreground">{dateTime(po.createdAt)}</p>
          </div>
          {po.expectedDeliveryDate && (
            <div>
              <p className="text-xs text-muted-foreground">Expected Delivery</p>
              <p className="text-sm font-medium">{dateTime(po.expectedDeliveryDate)}</p>
            </div>
          )}
          {formatPurchaseOrderPaymentTerms(po.paymentTermsMonths) && (
            <div>
              <p className="text-xs text-muted-foreground">Payment Terms</p>
              <p className="text-sm font-medium">
                {formatPurchaseOrderPaymentTerms(po.paymentTermsMonths)}
              </p>
            </div>
          )}
          {(po.discountPercent ?? 0) > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Discount</p>
              <p className="text-sm font-medium text-green-600">{po.discountPercent}% off</p>
            </div>
          )}
          {po.approvedBy && (
            <div>
              <p className="text-xs text-muted-foreground">Approved By</p>
              <p className="text-sm font-medium">{po.approvedBy.name}</p>
              {po.approvedAt && (
                <p className="text-xs text-muted-foreground">{dateTime(po.approvedAt)}</p>
              )}
            </div>
          )}
          {po.receivedBy && (
            <div>
              <p className="text-xs text-muted-foreground">Fulfilled By</p>
              <p className="text-sm font-medium">{po.receivedBy.name}</p>
              {po.receivedAt && (
                <p className="text-xs text-muted-foreground">{dateTime(po.receivedAt)}</p>
              )}
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Product</th>
                <th className="text-right px-4 py-2 font-medium">Qty Ordered</th>
                <th className="text-right px-4 py-2 font-medium">Fulfilled</th>
                <th className="text-right px-4 py-2 font-medium">Unit Price</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {po.items.map((item) => (
                <tr key={item._id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                  </td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">
                    {po.status === "received" ? (
                      <span className="text-green-600 font-medium">{item.receivedQuantity}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{money(item.unitCost)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{money(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-muted/50">
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right text-muted-foreground">
                  Subtotal
                </td>
                <td className="px-4 py-2 text-right">{money(po.subtotal)}</td>
              </tr>
              {(po.discountAmount ?? 0) > 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-green-600">
                    Discount ({po.discountPercent}%)
                  </td>
                  <td className="px-4 py-2 text-right text-green-600 font-medium">
                    −{money(po.discountAmount)}
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right font-semibold">Total</td>
                <td className="px-4 py-2 text-right font-bold text-base">{money(po.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <PaymentTermsSchedulePanel
          total={po.total}
          paymentTermsMonths={po.paymentTermsMonths}
          termsStartDate={po.createdAt}
          formatMoney={money}
          formatDate={formatDate}
        />

        {po.notes && (
          <div className="border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{po.notes}</p>
          </div>
        )}
      </div>

      {/* Fulfill Dialog */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5" />
              Mark as Fulfilled — {po.poNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter the quantity fulfilled for each item for{" "}
              <strong>{po.organizationId?.name}</strong>.
            </p>
            <div className="border rounded-lg divide-y">
              {po.items.map((item) => (
                <div key={item._id} className="flex items-center justify-between p-3 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.sku} · Ordered: {item.quantity}
                    </p>
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Fulfilled</Label>
                    <Input
                      type="number"
                      min={0}
                      max={item.quantity}
                      className="h-8 text-sm"
                      value={receivedQtys[item._id] ?? item.quantity}
                      onChange={(e) =>
                        setReceivedQtys((prev) => ({
                          ...prev,
                          [item._id]: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => receiveMutation.mutate()} disabled={receiveMutation.isPending}>
              {receiveMutation.isPending ? "Processing..." : "Confirm Fulfillment"}
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
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["purchase-order", id] });
          queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
          toast({
            title: signRole === "submit" ? "Purchase order submitted" : "Purchase order approved",
          });
        }}
      />
    </div>
  );
}
