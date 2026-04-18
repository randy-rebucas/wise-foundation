"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
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
import { ArrowLeft, PackageCheck, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";


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
  status: "draft" | "submitted" | "approved" | "received" | "cancelled";
  supplierId?: { name: string; contactPerson?: string; email?: string; phone?: string } | null;
  supplierName?: string;
  branchId: { name: string; code: string };
  subtotal: number;
  total: number;
  expectedDeliveryDate?: string;
  notes?: string;
  createdBy: { name: string };
  approvedBy?: { name: string } | null;
  receivedBy?: { name: string } | null;
  approvedAt?: string;
  receivedAt?: string;
  createdAt: string;
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
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});

  const { data: result, isLoading } = useQuery({
    queryKey: ["purchase-order", id],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-orders/${id}`);
      return res.json();
    },
  });

  const po: PurchaseOrderDetail | undefined = result?.data;

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase-order", id] }),
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
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-order", id] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setReceiveOpen(false);
    },
  });

  function openReceive() {
    if (!po) return;
    const defaults: Record<string, number> = {};
    po.items.forEach((item) => {
      defaults[item._id] = item.quantity;
    });
    setReceivedQtys(defaults);
    setReceiveOpen(true);
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

  if (!po) {
    return (
      <div className="flex flex-col">
        <Header title="Purchase Order" />
        <div className="flex-1 p-6">
          <p className="text-muted-foreground">Purchase order not found.</p>
        </div>
      </div>
    );
  }

  const supplierDisplay = po.supplierId?.name ?? po.supplierName ?? "—";

  return (
    <div className="flex flex-col">
      <Header title={`PO: ${po.poNumber}`} subtitle={`Branch: ${po.branchId?.name}`} />
      <div className="flex-1 p-6 space-y-6 max-w-4xl">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/purchase-orders`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_BADGE[po.status] ?? "secondary"} className="text-sm px-3 py-1">
              {po.status.toUpperCase()}
            </Badge>
            {po.status === "draft" && (
              <>
                <Button
                  size="sm"
                  onClick={() => statusMutation.mutate("submitted")}
                  disabled={statusMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => statusMutation.mutate("cancelled")}
                  disabled={statusMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
            {po.status === "submitted" && (
              <>
                <Button
                  size="sm"
                  onClick={() => statusMutation.mutate("approved")}
                  disabled={statusMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => statusMutation.mutate("cancelled")}
                  disabled={statusMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
            {po.status === "approved" && (
              <Button size="sm" onClick={openReceive}>
                <PackageCheck className="h-4 w-4 mr-2" />
                Receive Goods
              </Button>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border rounded-lg p-4">
          <div>
            <p className="text-xs text-muted-foreground">Supplier</p>
            <p className="text-sm font-medium">{supplierDisplay}</p>
            {po.supplierId?.contactPerson && (
              <p className="text-xs text-muted-foreground">{po.supplierId.contactPerson}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Created By</p>
            <p className="text-sm font-medium">{po.createdBy?.name}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(po.createdAt)}</p>
          </div>
          {po.expectedDeliveryDate && (
            <div>
              <p className="text-xs text-muted-foreground">Expected Delivery</p>
              <p className="text-sm font-medium">{formatDateTime(po.expectedDeliveryDate)}</p>
            </div>
          )}
          {po.approvedBy && (
            <div>
              <p className="text-xs text-muted-foreground">Approved By</p>
              <p className="text-sm font-medium">{po.approvedBy.name}</p>
              {po.approvedAt && (
                <p className="text-xs text-muted-foreground">{formatDateTime(po.approvedAt)}</p>
              )}
            </div>
          )}
          {po.receivedBy && (
            <div>
              <p className="text-xs text-muted-foreground">Received By</p>
              <p className="text-sm font-medium">{po.receivedBy.name}</p>
              {po.receivedAt && (
                <p className="text-xs text-muted-foreground">{formatDateTime(po.receivedAt)}</p>
              )}
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Product</th>
                <th className="text-right px-4 py-2 font-medium">Qty Ordered</th>
                <th className="text-right px-4 py-2 font-medium">Received</th>
                <th className="text-right px-4 py-2 font-medium">Unit Cost</th>
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
                  <td className="px-4 py-3 text-right">{formatCurrency(item.unitCost)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-muted/50">
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right font-semibold">Total</td>
                <td className="px-4 py-2 text-right font-bold text-base">{formatCurrency(po.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {po.notes && (
          <div className="border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{po.notes}</p>
          </div>
        )}
      </div>

      {/* Receive Goods Dialog */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5" />
              Receive Goods — {po.poNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter the quantity actually received for each item. Stock will be added to{" "}
              <strong>{po.branchId?.name}</strong>.
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
                    <Label className="text-xs">Received</Label>
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
            <Button
              onClick={() => receiveMutation.mutate()}
              disabled={receiveMutation.isPending}
            >
              {receiveMutation.isPending ? "Processing..." : "Confirm Receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
