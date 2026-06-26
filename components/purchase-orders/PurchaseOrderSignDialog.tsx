"use client";

import { useRef, useState } from "react";
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
import { Loader2, PenLine } from "lucide-react";
import dynamic from "next/dynamic";
import type { SignaturePadHandle } from "@/components/purchase-orders/SignaturePad";
import type { PurchaseOrderSignRole } from "@/lib/types/purchaseOrderSignature";

const SignaturePad = dynamic(
  () => import("@/components/purchase-orders/SignaturePad").then((m) => m.SignaturePad),
  { ssr: false, loading: () => <div className="h-36 w-full rounded-lg border border-dashed border-input bg-muted animate-pulse" /> }
);

const ROLE_COPY: Record<
  PurchaseOrderSignRole,
  { title: string; description: string; action: string }
> = {
  submit: {
    title: "Sign & submit",
    description: "Draw your signature to submit this purchase order for approval.",
    action: "Submit with signature",
  },
  approve: {
    title: "Sign & approve",
    description: "Draw your signature to approve this purchase order.",
    action: "Approve with signature",
  },
};

export function PurchaseOrderSignDialog({
  open,
  onOpenChange,
  poId,
  poNumber,
  role,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poId: string;
  poNumber: string;
  role: PurchaseOrderSignRole;
  onSuccess: () => void;
}) {
  const { data: session } = useSession();
  const padRef = useRef<SignaturePadHandle>(null);
  const [signedByName, setSignedByName] = useState(session?.user?.name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const copy = ROLE_COPY[role];

  async function handleSubmit() {
    setError("");
    if (!signedByName.trim()) {
      setError("Enter the signer's name.");
      return;
    }
    if (padRef.current?.isEmpty()) {
      setError("Draw your signature before continuing.");
      return;
    }
    const signatureDataUrl = padRef.current?.toDataURL() ?? "";
    if (!signatureDataUrl) {
      setError("Draw your signature before continuing.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          signedByName: signedByName.trim(),
          signatureDataUrl,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error ?? "Could not save signature");
      }
      padRef.current?.clear();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save signature");
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5" />
            {copy.title} — {poNumber}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{copy.description}</p>
          <div className="space-y-1">
            <Label htmlFor="signer-name">Printed name</Label>
            <Input
              id="signer-name"
              value={signedByName}
              onChange={(e) => setSignedByName(e.target.value)}
              placeholder="Full name"
              disabled={submitting}
            />
          </div>
          <div className="space-y-1">
            <Label>Signature</Label>
            <SignaturePad ref={padRef} />
          </div>
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
              copy.action
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
