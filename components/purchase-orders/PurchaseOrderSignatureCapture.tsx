"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignaturePad, type SignaturePadHandle } from "@/components/purchase-orders/SignaturePad";

export type PurchaseOrderSignatureCaptureHandle = {
  getSignedByName: () => string;
  getSignatureDataUrl: () => string | null;
  isEmpty: () => boolean;
  clear: () => void;
};

type PurchaseOrderSignatureCaptureProps = {
  signedByName: string;
  onSignedByNameChange: (name: string) => void;
  disabled?: boolean;
  nameInputId?: string;
};

export const PurchaseOrderSignatureCapture = forwardRef<
  PurchaseOrderSignatureCaptureHandle,
  PurchaseOrderSignatureCaptureProps
>(function PurchaseOrderSignatureCapture(
  { signedByName, onSignedByNameChange, disabled, nameInputId = "signer-name" },
  ref
) {
  const padRef = useRef<SignaturePadHandle>(null);

  useImperativeHandle(ref, () => ({
    getSignedByName: () => signedByName.trim(),
    getSignatureDataUrl: () => padRef.current?.toDataURL() ?? null,
    isEmpty: () => padRef.current?.isEmpty() ?? true,
    clear: () => padRef.current?.clear(),
  }));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor={nameInputId}>Printed name</Label>
        <Input
          id={nameInputId}
          value={signedByName}
          onChange={(e) => onSignedByNameChange(e.target.value)}
          placeholder="Full name"
          disabled={disabled}
        />
      </div>
      <div className="space-y-1">
        <Label>Signature</Label>
        <SignaturePad ref={padRef} />
      </div>
    </div>
  );
});

export function validatePurchaseOrderSignatureCapture(
  capture: PurchaseOrderSignatureCaptureHandle | null
): string | null {
  if (!capture?.getSignedByName()) {
    return "Enter the signer's name.";
  }
  if (capture.isEmpty()) {
    return "Draw your signature before continuing.";
  }
  if (!capture.getSignatureDataUrl()) {
    return "Draw your signature before continuing.";
  }
  return null;
}
