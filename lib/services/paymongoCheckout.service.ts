import {
  createPaymentIntent,
  mapPaymongoBrand,
  paymentIntentIsPaid,
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
  paymentMethodAllowed: ("card" | "gcash")[]
) {
  if (!isPaymongoConfigured()) {
    throw new Error("PayMongo is not configured");
  }

  const quote = await quoteMarketplaceCheckout(input, customerUserId);
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
