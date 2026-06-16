import {
  checkoutSessionIsPaid,
  createCheckoutSession,
  createPaymentIntent,
  mapPaymongoBrand,
  paymentIntentIsPaid,
  retrieveCheckoutSession,
  retrievePaymentIntent,
  retrievePaymentMethod,
} from "@/lib/paymongo/api";
import { isPaymongoConfigured } from "@/lib/paymongo/config";
import { quoteMarketplaceCheckout } from "@/lib/services/marketplaceCheckoutQuote.service";
import type { MarketplaceCheckoutInput } from "@/lib/validations/marketplace.schema";
import type { CardBrand } from "@/lib/utils/cardPayment";

export async function createMarketplacePaymentIntent(
  input: Pick<MarketplaceCheckoutInput, "items" | "shippingMethod" | "shipping">,
  customerUserId: string | null,
  paymentMethodAllowed: ("card" | "gcash" | "paymaya" | "grab_pay")[]
) {
  if (!isPaymongoConfigured()) {
    throw new Error("PayMongo is not configured");
  }

  const quote = await quoteMarketplaceCheckout(
    {
      ...input,
      paymentMethod: paymentMethodAllowed[0] === "gcash" ? "gcash" : "card",
    },
    customerUserId
  );
  const intent = await createPaymentIntent({
    amountCentavos: quote.amountCentavos,
    description: `Glowish order — ${input.shipping.email}`,
    paymentMethodAllowed,
    metadata: {
      channel: "marketplace",
      email: input.shipping.email,
    },
  });

  return {
    quote,
    paymentIntentId: intent.id,
    clientKey: intent.attributes.client_key,
    status: intent.attributes.status,
  };
}

export async function verifyMarketplacePaymongoPayment(params: {
  paymentIntentId: string;
  expectedAmountCentavos: number;
  expectedMethod: "card" | "gcash";
}) {
  const intent = await retrievePaymentIntent(params.paymentIntentId);
  const attrs = intent.attributes;

  if (attrs.amount !== params.expectedAmountCentavos) {
    throw new Error("Payment amount does not match order total");
  }

  if (!paymentIntentIsPaid(attrs.status)) {
    throw new Error(
      attrs.last_payment_error?.message ??
        `Payment not completed (status: ${attrs.status}). Please try again.`
    );
  }

  const payments = attrs.payments ?? [];
  const paymentId = payments[0]?.id;
  let cardBrand: CardBrand = "unknown";
  let cardLast4 = "0000";
  let cardholderName = "Card";

  if (params.expectedMethod === "card" && paymentId) {
    const pmId = (payments[0] as { attributes?: { payment_method?: string } })?.attributes
      ?.payment_method;
    if (pmId) {
      try {
        const pm = await retrievePaymentMethod(pmId);
        cardLast4 = pm.attributes.details?.last4 ?? cardLast4;
        cardBrand = mapPaymongoBrand(pm.attributes.details?.brand);
        cardholderName = pm.attributes.billing?.name ?? cardholderName;
      } catch {
        /* optional enrichment */
      }
    }
  }

  return {
    paymentIntentId: intent.id,
    paymentId,
    status: attrs.status,
    cardBrand,
    cardLast4,
    cardholderName,
  };
}

export async function createMarketplaceCheckoutSession(
  input: Pick<MarketplaceCheckoutInput, "items" | "shippingMethod" | "shipping"> & {
    paymentMethod: "gcash" | "maya" | "grab_pay" | "card";
  },
  customerUserId: string | null,
  successUrl: string,
  cancelUrl: string
) {
  if (!isPaymongoConfigured()) {
    throw new Error("PayMongo is not configured");
  }

  const pmMethod =
    input.paymentMethod === "maya"
      ? "paymaya"
      : input.paymentMethod === "grab_pay"
        ? "grab_pay"
        : input.paymentMethod; // "gcash" | "card"

  const quote = await quoteMarketplaceCheckout(
    { ...input, paymentMethod: input.paymentMethod },
    customerUserId
  );

  const session = await createCheckoutSession({
    amountCentavos: quote.amountCentavos,
    description: `Glowish order — ${input.shipping.email}`,
    lineItems: [
      {
        name: "Glowish order",
        amount: quote.amountCentavos,
        quantity: 1,
      },
    ],
    paymentMethodTypes: [pmMethod],
    successUrl,
    cancelUrl,
    metadata: {
      channel: "marketplace",
      email: input.shipping.email,
    },
  });

  return {
    quote,
    sessionId: session.id,
    checkoutUrl: session.attributes.checkout_url,
  };
}

export async function verifyMarketplaceCheckoutSession(params: {
  sessionId: string;
  expectedAmountCentavos: number;
}) {
  const session = await retrieveCheckoutSession(params.sessionId);

  if (!checkoutSessionIsPaid(session)) {
    throw new Error("Payment not completed. Please try again.");
  }

  const paidPayment = session.attributes.payments.find((p) => p.attributes.status === "paid");
  if (paidPayment && paidPayment.attributes.amount !== params.expectedAmountCentavos) {
    throw new Error("Payment amount does not match order total");
  }

  return {
    sessionId: session.id,
    paymentId: paidPayment?.id,
    status: "paid" as const,
  };
}
