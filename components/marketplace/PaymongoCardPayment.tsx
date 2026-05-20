"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PAYMONGO_SCRIPT = "https://js.paymongo.com/v1";

export type PaymongoCheckoutPayload = {
  items: { productId: string; variantId?: string | null; quantity: number }[];
  shipping: {
    fullName: string;
    email: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postalCode: string;
  };
  shippingMethod: string;
};

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

export type PaymongoCardPaymentHandle = {
  pay: (checkout: PaymongoCheckoutPayload) => Promise<{
    paymentIntentId: string;
    pendingRedirect?: boolean;
  }>;
  isReady: boolean;
};

interface PaymongoCardPaymentProps {
  billingName: string;
  billingEmail: string;
  billingPhone: string;
  onBillingChange: (field: "billingName" | "billingEmail" | "billingPhone", value: string) => void;
  returnUrl: string;
}

export const PaymongoCardPaymentForm = forwardRef<PaymongoCardPaymentHandle, PaymongoCardPaymentProps>(
  function PaymongoCardPaymentForm(
    { billingName, billingEmail, billingPhone, onBillingChange, returnUrl },
    ref
  ) {
    const cardElementRef = useRef<PaymongoCardElement | null>(null);
    const paymongoRef = useRef<PaymongoInstance | null>(null);
    const [ready, setReady] = useState(false);
    const [cardError, setCardError] = useState("");
    const [loadError, setLoadError] = useState("");

    useEffect(() => {
      let cancelled = false;
      (async () => {
        try {
          const res = await fetch("/api/marketplace/paymongo/config");
          const json = await res.json();
          if (!json.success) throw new Error(json.error ?? "PayMongo unavailable");
          if (!json.data.enabled || !json.data.publicKey) {
            if (!cancelled) setLoadError("Card payments are not configured. Contact support.");
            return;
          }
          await loadPaymongoScript();
          if (cancelled || !window.Paymongo) return;
          paymongoRef.current = new window.Paymongo(json.data.publicKey);
          const elements = paymongoRef.current.elements();
          const card = elements.create("card", {
            style: {
              base: {
                color: "#1e3157",
                fontFamily: "system-ui, sans-serif",
                fontSize: "16px",
                "::placeholder": { color: "#94a3b8" },
              },
              invalid: { color: "#dc2626" },
            },
          });
          card.on("change", (event) => {
            setCardError(event.error?.message ?? "");
          });
          card.mount("#paymongo-card-element");
          cardElementRef.current = card;
          if (!cancelled) setReady(true);
        } catch (err) {
          if (!cancelled) {
            setLoadError(err instanceof Error ? err.message : "Could not load PayMongo");
          }
        }
      })();
      return () => {
        cancelled = true;
        cardElementRef.current?.unmount();
      };
    }, []);

    const processPayment = useCallback(
      async (checkout: PaymongoCheckoutPayload) => {
        if (!paymongoRef.current || !cardElementRef.current) {
          throw new Error("Payment form is not ready");
        }
        if (cardError) throw new Error(cardError);
        if (!billingName.trim() || !billingEmail.trim()) {
          throw new Error("Enter cardholder name and email");
        }

        const intentRes = await fetch("/api/marketplace/paymongo/intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...checkout, paymentType: "card" }),
        });
        const intentJson = await intentRes.json();
        if (!intentJson.success) {
          throw new Error(intentJson.error ?? "Could not start payment");
        }

        const { paymentIntentId, clientKey } = intentJson.data as {
          paymentIntentId: string;
          clientKey: string;
        };

        const paymentMethod = await paymongoRef.current.createPaymentMethod("card", {
          card: cardElementRef.current,
          billing: {
            name: billingName.trim(),
            email: billingEmail.trim(),
            phone: billingPhone.trim() || undefined,
          },
        });

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
          throw new Error(attachJson.error ?? "Payment failed");
        }

        const { status, redirectUrl } = attachJson.data as {
          status: string;
          redirectUrl: string | null;
        };

        if (redirectUrl) {
          window.location.href = redirectUrl;
          return { paymentIntentId, pendingRedirect: true as const };
        }

        if (status !== "succeeded" && status !== "processing") {
          throw new Error("Payment was not completed. Please try again.");
        }

        return { paymentIntentId, pendingRedirect: false as const };
      },
      [billingEmail, billingName, billingPhone, cardError, returnUrl]
    );

    useImperativeHandle(ref, () => ({ pay: processPayment, isReady: ready }), [
      processPayment,
      ready,
    ]);

    if (loadError) {
      return <p className="mt-4 text-sm text-destructive">{loadError}</p>;
    }

    return (
      <div className="mt-4 space-y-4 rounded-2xl border border-violet-200/80 bg-violet-50/40 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#1e3157]">
          <CreditCard className="h-4 w-4 text-violet-600" />
          Card payment (secured by PayMongo)
        </div>
        <p className="text-xs leading-5 text-[#2A4C6A]/70">
          Card details are sent directly to PayMongo. We never store your full card number on our
          servers.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pmBillingName">Name on card</Label>
            <Input
              id="pmBillingName"
              className="rounded-xl border-white/70 bg-white/80"
              value={billingName}
              onChange={(e) => onBillingChange("billingName", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pmBillingEmail">Email</Label>
            <Input
              id="pmBillingEmail"
              type="email"
              className="rounded-xl border-white/70 bg-white/80"
              value={billingEmail}
              onChange={(e) => onBillingChange("billingEmail", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pmBillingPhone">Phone (optional)</Label>
            <Input
              id="pmBillingPhone"
              className="rounded-xl border-white/70 bg-white/80"
              value={billingPhone}
              onChange={(e) => onBillingChange("billingPhone", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Card details</Label>
          <div
            id="paymongo-card-element"
            className="min-h-[44px] rounded-xl border border-white/70 bg-white/90 px-3 py-3"
          />
          {!ready ? (
            <p className="flex items-center gap-2 text-xs text-[#2A4C6A]/65">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading secure card form…
            </p>
          ) : null}
          {cardError ? <p className="text-xs text-destructive">{cardError}</p> : null}
        </div>
      </div>
    );
  }
);
