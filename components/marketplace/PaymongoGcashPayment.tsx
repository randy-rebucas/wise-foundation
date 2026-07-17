"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Loader2, Smartphone } from "lucide-react";
import { PAYMONGO_CHECKOUT_STORAGE_KEY } from "@/lib/constants/paymongoCheckout";
import type { PaymongoPendingCheckout } from "@/lib/constants/paymongoCheckout";
import type { PaymongoCheckoutPayload } from "@/components/marketplace/PaymongoCardPayment";

const PAYMONGO_SCRIPT = "https://js.paymongo.com/v1";

function loadPaymongoScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.Paymongo) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PAYMONGO_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("PayMongo.js failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = PAYMONGO_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("PayMongo.js failed to load"));
    document.body.appendChild(script);
  });
}

export type PaymongoGcashPaymentHandle = {
  pay: (
    checkout: PaymongoCheckoutPayload,
    pendingOrder: Omit<PaymongoPendingCheckout, "paymentIntentId">
  ) => Promise<void>;
  isReady: boolean;
};

interface PaymongoGcashPaymentProps {
  billingName: string;
  billingEmail: string;
  billingPhone: string;
  returnUrl: string;
}

export const PaymongoGcashPaymentForm = forwardRef<
  PaymongoGcashPaymentHandle,
  PaymongoGcashPaymentProps
>(function PaymongoGcashPaymentForm(
  { billingName, billingEmail, billingPhone, returnUrl },
  ref
) {
  const paymongoRef = useRef<PaymongoInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/marketplace/paymongo/config");
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "PayMongo unavailable");
        if (!json.data.enabled || !json.data.publicKey) {
          if (!cancelled) setLoadError("GCash payments are not configured. Contact support.");
          return;
        }
        await loadPaymongoScript();
        if (cancelled || !window.Paymongo) return;
        paymongoRef.current = new window.Paymongo(json.data.publicKey);
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Could not load PayMongo");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const processPayment = useCallback(
    async (
      checkout: PaymongoCheckoutPayload,
      pendingOrder: Omit<PaymongoPendingCheckout, "paymentIntentId">
    ) => {
      if (!paymongoRef.current) throw new Error("GCash payment is not ready");
      if (!billingName.trim() || !billingEmail.trim()) {
        throw new Error("Enter your name and email for GCash");
      }

      const intentRes = await fetch("/api/marketplace/paymongo/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...checkout, paymentType: "gcash" }),
      });
      const intentJson = await intentRes.json();
      if (!intentJson.success) {
        throw new Error(intentJson.error ?? "Could not start GCash payment");
      }

      const { paymentIntentId, clientKey } = intentJson.data as {
        paymentIntentId: string;
        clientKey: string;
      };

      const paymentMethod = await paymongoRef.current.createPaymentMethod("gcash", {
        billing: {
          name: billingName.trim(),
          email: billingEmail.trim(),
          phone: billingPhone.trim() || undefined,
        },
      });

      const pending: PaymongoPendingCheckout = {
        ...pendingOrder,
        paymentIntentId,
      };
      sessionStorage.setItem(PAYMONGO_CHECKOUT_STORAGE_KEY, JSON.stringify(pending));

      const attachRes = await fetch("/api/marketplace/paymongo/attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId,
          paymentMethodId: paymentMethod.id,
          clientKey,
          returnUrl,
        }),
      });
      const attachJson = await attachRes.json();
      if (!attachJson.success) {
        sessionStorage.removeItem(PAYMONGO_CHECKOUT_STORAGE_KEY);
        throw new Error(attachJson.error ?? "GCash payment failed");
      }

      const { status, redirectUrl } = attachJson.data as {
        status: string;
        redirectUrl: string | null;
      };

      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }

      if (status !== "succeeded" && status !== "processing") {
        sessionStorage.removeItem(PAYMONGO_CHECKOUT_STORAGE_KEY);
        throw new Error("GCash payment was not completed. Please try again.");
      }

      window.location.href = `${returnUrl}?payment_intent_id=${encodeURIComponent(paymentIntentId)}`;
    },
    [billingEmail, billingName, billingPhone, returnUrl]
  );

  useImperativeHandle(ref, () => ({ pay: processPayment, isReady: ready }), [
    processPayment,
    ready,
  ]);

  if (loadError) {
    return <p className="mt-4 text-sm text-destructive">{loadError}</p>;
  }

  return (
    <div className="mt-4 space-y-3 rounded-[10px] border border-emerald-200/80 bg-emerald-50/40 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#1e3157]">
        <Smartphone className="h-4 w-4 text-emerald-600" />
        GCash (secured by PayMongo)
      </div>
      <p className="text-xs leading-5 text-[#2A4C6A]/70">
        You will be redirected to GCash to authorize payment. Your mobile number is not stored on
        our servers.
      </p>
      {!ready ? (
        <p className="flex items-center gap-2 text-xs text-[#2A4C6A]/65">
          <Loader2 className="h-3 w-3 animate-spin" />
          Preparing GCash checkout…
        </p>
      ) : null}
    </div>
  );
});
