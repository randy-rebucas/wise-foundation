"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Loader2, Smartphone } from "lucide-react";
import { PAYMONGO_CHECKOUT_STORAGE_KEY } from "@/lib/constants/paymongoCheckout";
import type { PaymongoPendingCheckout } from "@/lib/constants/paymongoCheckout";
import type { PaymongoCheckoutPayload } from "@/components/marketplace/PaymongoCardPayment";
import { loadPaymongoScript } from "@/lib/paymongo/loadScript";

export type EwalletPaymentType = "gcash" | "paymaya" | "grab_pay";

export type PaymongoEwalletPaymentHandle = {
  pay: (
    checkout: PaymongoCheckoutPayload,
    pendingOrder: Omit<PaymongoPendingCheckout, "paymentIntentId">
  ) => Promise<void>;
  isReady: boolean;
};

interface PaymongoEwalletPaymentProps {
  paymentType: EwalletPaymentType;
  billingName: string;
  billingEmail: string;
  billingPhone: string;
  returnUrl: string;
}

const THEME: Record<EwalletPaymentType, { border: string; bg: string; icon: string; label: string }> = {
  gcash: {
    border: "border-emerald-200/80",
    bg: "bg-emerald-50/40",
    icon: "text-emerald-600",
    label: "GCash",
  },
  paymaya: {
    border: "border-green-200/80",
    bg: "bg-green-50/40",
    icon: "text-green-600",
    label: "Maya",
  },
  grab_pay: {
    border: "border-lime-200/80",
    bg: "bg-lime-50/40",
    icon: "text-lime-600",
    label: "GrabPay",
  },
};

export const PaymongoEwalletPaymentForm = forwardRef<
  PaymongoEwalletPaymentHandle,
  PaymongoEwalletPaymentProps
>(function PaymongoEwalletPaymentForm(
  { paymentType, billingName, billingEmail, billingPhone, returnUrl },
  ref
) {
  const paymongoRef = useRef<PaymongoInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");

  const theme = THEME[paymentType];

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setLoadError("");
    paymongoRef.current = null;

    (async () => {
      try {
        const res = await fetch("/api/marketplace/paymongo/config");
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "PayMongo unavailable");
        if (!json.data.enabled || !json.data.publicKey) {
          if (!cancelled) setLoadError(`${theme.label} payments are not configured. Contact support.`);
          return;
        }
        await loadPaymongoScript();
        if (cancelled) return;
        if (!window.Paymongo) {
          throw new Error("PayMongo.js did not initialize. Check your public key.");
        }
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
  }, [paymentType, theme.label]);

  const processPayment = useCallback(
    async (
      checkout: PaymongoCheckoutPayload,
      pendingOrder: Omit<PaymongoPendingCheckout, "paymentIntentId">
    ) => {
      if (!paymongoRef.current) throw new Error(`${theme.label} payment is not ready`);
      if (!billingName.trim() || !billingEmail.trim()) {
        throw new Error(`Enter your name and email for ${theme.label}`);
      }

      const intentRes = await fetch("/api/marketplace/paymongo/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...checkout, paymentType }),
      });
      const intentJson = await intentRes.json();
      if (!intentJson.success) {
        throw new Error(intentJson.error ?? `Could not start ${theme.label} payment`);
      }

      const { paymentIntentId, clientKey } = intentJson.data as {
        paymentIntentId: string;
        clientKey: string;
      };

      const paymentMethod = await paymongoRef.current.createPaymentMethod(paymentType, {
        billing: {
          name: billingName.trim(),
          email: billingEmail.trim(),
          phone: billingPhone.trim() || undefined,
        },
      });

      const pending: PaymongoPendingCheckout = {
        ...pendingOrder,
        sessionId: paymentIntentId,
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
        throw new Error(attachJson.error ?? `${theme.label} payment failed`);
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
        throw new Error(`${theme.label} payment was not completed. Please try again.`);
      }

      window.location.href = `${returnUrl}?payment_intent_id=${encodeURIComponent(paymentIntentId)}`;
    },
    [billingEmail, billingName, billingPhone, paymentType, theme.label, returnUrl]
  );

  useImperativeHandle(ref, () => ({ pay: processPayment, isReady: ready }), [
    processPayment,
    ready,
  ]);

  if (loadError) {
    return <p className="mt-4 text-sm text-destructive">{loadError}</p>;
  }

  return (
    <div className={`mt-4 space-y-3 rounded-2xl border ${theme.border} ${theme.bg} p-4`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-[#1e3157]">
        <Smartphone className={`h-4 w-4 ${theme.icon}`} />
        {theme.label} (secured by PayMongo)
      </div>
      <p className="text-xs leading-5 text-[#2A4C6A]/70">
        You will be redirected to {theme.label} to authorize payment. Your account details are not
        stored on our servers.
      </p>
      {!ready ? (
        <p className="flex items-center gap-2 text-xs text-[#2A4C6A]/65">
          <Loader2 className="h-3 w-3 animate-spin" />
          Preparing {theme.label} checkout…
        </p>
      ) : null}
    </div>
  );
});
