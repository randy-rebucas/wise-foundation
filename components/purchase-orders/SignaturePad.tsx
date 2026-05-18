"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SignaturePadHandle = {
  isEmpty: () => boolean;
  toDataURL: () => string;
  clear: () => void;
};

type SignaturePadProps = {
  className?: string;
};

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ className }, ref) {
    const padRef = useRef<SignatureCanvas>(null);

    useImperativeHandle(ref, () => ({
      isEmpty: () => padRef.current?.isEmpty() ?? true,
      toDataURL: () => padRef.current?.toDataURL("image/png") ?? "",
      clear: () => padRef.current?.clear(),
    }));

    return (
      <div className={cn("space-y-2", className)}>
        <div className="rounded-lg border border-dashed border-input bg-white">
          <SignatureCanvas
            ref={padRef}
            penColor="#1e3157"
            canvasProps={{
              className: "h-36 w-full rounded-lg touch-none",
            }}
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => padRef.current?.clear()}>
          Clear signature
        </Button>
      </div>
    );
  }
);
