"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, PackageCheck, PenLine } from "lucide-react";
import {
  PurchaseOrderSignatureCapture,
  validatePurchaseOrderSignatureCapture,
  type PurchaseOrderSignatureCaptureHandle,
} from "@/components/purchase-orders/PurchaseOrderSignatureCapture";

export type ReceiveLineItem = {
  _id: string;
  productName: string;
  sku: string;
  quantity: number;
};

export function PurchaseOrderReceiveDialog({
  open,
  onOpenChange,
  poId,
  poNumber,
  organizationName,
  items,
  isBranchPo,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poId: string;
  poNumber: string;
  organizationName?: string;
  items: ReceiveLineItem[];
  /** Branch-targeted PO — HQ inventory staff wording */
  isBranchPo?: boolean;
  onSuccess: () => void;
}) {
  const { data: session } = useSession();
  const captureRef = useRef<PurchaseOrderSignatureCaptureHandle>(null);
  const [signedByName, setSignedByName] = useState(session?.user?.name ?? "");
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const defaults: Record<string, number> = {};
    items.forEach((item) => {
      defaults[item._id] = item.quantity;
    });
    setReceivedQtys(defaults);
    setSignedByName(session?.user?.name ?? "");
    setError("");
  }, [open, items, session?.user?.name]);

  const title = isBranchPo ? "Mark as fulfilled" : "Confirm delivery";
  const actionLabel = isBranchPo ? "Fulfill with signature" : "Sign & receive";

  async function handleSubmit() {
    setError("");
    const validationError = validatePurchaseOrderSignatureCapture(captureRef.current);
    if (validationError) {
      setError(validationError);
      return;
    }
    const signatureDataUrl = captureRef.current?.getSignatureDataUrl();
    if (!signatureDataUrl) {
      setError("Draw your signature before continuing.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            itemId: item._id,
            receivedQuantity: receivedQtys[item._id] ?? item.quantity,
          })),
          signedByName: captureRef.current?.getSignedByName(),
          signatureDataUrl,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error ?? "Could not confirm delivery");
      }
      captureRef.current?.clear();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm delivery");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            {title} — {poNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isBranchPo
              ? "Enter fulfilled quantities and sign to update branch inventory."
              : "Confirm quantities received and sign to acknowledge this delivery"}
            {organizationName ? (
              <>
                {" "}
                for <strong>{organizationName}</strong>.
              </>
            ) : (
              "."
            )}
          </p>

          <div className="border rounded-lg divide-y">
            {items.map((item) => (
              <div key={item._id} className="flex items-center justify-between p-3 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.sku} · Ordered: {item.quantity}
                  </p>
                </div>
                <div className="w-24 space-y-1">
                  <Label className="text-xs">{isBranchPo ? "Fulfilled" : "Received"}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={item.quantity}
                    className="h-8 text-sm"
                    value={receivedQtys[item._id] ?? item.quantity}
                    onChange={(e) =>
                      setReceivedQtys((prev) => ({
                        ...prev,
                        [item._id]: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    disabled={submitting}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm font-medium">
            <PenLine className="h-4 w-4" />
            Signature required
          </div>
          <PurchaseOrderSignatureCapture
            ref={captureRef}
            signedByName={signedByName}
            onSignedByNameChange={setSignedByName}
            disabled={submitting}
            nameInputId="receive-signer-name"
          />

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              actionLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
