/** Shared marketplace shipping rules (cart + checkout + server validation). */

import {
  computeCourierBaseShipping,
  computeCourierCodFee,
  isMetroManilaDelivery,
  resolveParcelWeightTier,
  resolveShippingZone,
  type MarketplaceCourierId,
} from "@/lib/utils/marketplaceCourierRates";

export const MARKETPLACE_FREE_SHIPPING_THRESHOLD = 2500;
export const MARKETPLACE_FLAT_SHIPPING_FEE = 99;

export const MARKETPLACE_SHIPPING_METHODS = [
  {
    id: "jt_economy",
    courier: "jt" as const,
    title: "J&T Express",
    detail: "Economy · 3–5 business days · COD available",
    supportsCod: true,
    requiresMetroManila: false,
  },
  {
    id: "flash_standard",
    courier: "flash" as const,
    title: "Flash Express",
    detail: "Standard · 2–4 business days · COD available",
    supportsCod: true,
    requiresMetroManila: false,
  },
  {
    id: "lalamove_same_day",
    courier: "lalamove" as const,
    title: "Lalamove",
    detail: "Same-day on-demand · Metro Manila · Prepaid only",
    supportsCod: false,
    requiresMetroManila: true,
  },
] as const;

/** @deprecated Legacy method ids stored on older orders — mapped at quote time. */
export const LEGACY_MARKETPLACE_SHIPPING_METHOD_IDS = {
  standard: "jt_economy",
  express: "flash_standard",
  same_day: "lalamove_same_day",
} as const;

export type MarketplaceShippingMethodId =
  (typeof MARKETPLACE_SHIPPING_METHODS)[number]["id"];

export type MarketplacePaymentMethodForShipping =
  | "cash"
  | "gcash"
  | "card"
  | "bank_transfer"
  | "credit";

export type CheckoutShippingQuoteInput = {
  merchandiseSubtotal: number;
  discountAmount?: number;
  shippingMethod: string;
  paymentMethod?: MarketplacePaymentMethodForShipping;
  region?: string;
  city?: string;
};

export type CheckoutShippingQuote = {
  methodId: string;
  courier: MarketplaceCourierId;
  zone: ReturnType<typeof resolveShippingZone>;
  weightTier: ReturnType<typeof resolveParcelWeightTier>;
  baseShipping: number;
  codFee: number;
  shippingCost: number;
};

function normalizeShippingMethodId(id: string): string {
  const legacy = LEGACY_MARKETPLACE_SHIPPING_METHOD_IDS as Record<string, string>;
  return legacy[id] ?? id;
}

export function getMarketplaceShippingOption(id: string) {
  const normalized = normalizeShippingMethodId(id);
  return MARKETPLACE_SHIPPING_METHODS.find((o) => o.id === normalized);
}

export function getCheckoutShippingMethodsForAddress(
  region: string,
  city: string,
  paymentMethod?: MarketplacePaymentMethodForShipping
) {
  const metro = isMetroManilaDelivery(region, city);
  return MARKETPLACE_SHIPPING_METHODS.filter((method) => {
    if (method.requiresMetroManila && !metro) return false;
    if (paymentMethod === "cash" && !method.supportsCod) return false;
    return true;
  });
}

/** Cart-style shipping: free over threshold, otherwise flat fee. */
export function computeCartStyleShipping(subtotal: number): number {
  return subtotal >= MARKETPLACE_FREE_SHIPPING_THRESHOLD ? 0 : MARKETPLACE_FLAT_SHIPPING_FEE;
}

export function computeCheckoutShippingQuote(
  input: CheckoutShippingQuoteInput
): CheckoutShippingQuote {
  const methodId = normalizeShippingMethodId(input.shippingMethod);
  const option = getMarketplaceShippingOption(methodId);
  if (!option) {
    throw new Error("Invalid shipping method");
  }

  const region = input.region?.trim() ?? "";
  const city = input.city?.trim() ?? "";
  const zone = region || city ? resolveShippingZone(region, city) : "ncr";

  if (option.requiresMetroManila && !isMetroManilaDelivery(region, city)) {
    throw new Error("Lalamove on-demand delivery is only available in Metro Manila");
  }
  if (input.paymentMethod === "cash" && !option.supportsCod) {
    throw new Error("Cash on delivery is not available for this shipping method");
  }

  const merchandiseSubtotal = Math.max(0, input.merchandiseSubtotal);
  const discountAmount = Math.max(0, input.discountAmount ?? 0);
  const merchandiseAfterDiscount = Math.round(Math.max(0, merchandiseSubtotal - discountAmount) * 100) / 100;

  const tier = resolveParcelWeightTier(merchandiseSubtotal);
  const baseShipping = computeCourierBaseShipping(option.courier, zone, tier);

  let codFee = 0;
  if (input.paymentMethod === "cash") {
    const collectibleBeforeCod = merchandiseAfterDiscount + baseShipping;
    codFee = computeCourierCodFee(option.courier, collectibleBeforeCod);
  }

  const shippingCost = Math.round((baseShipping + codFee) * 100) / 100;

  return {
    methodId: option.id,
    courier: option.courier,
    zone,
    weightTier: tier,
    baseShipping,
    codFee,
    shippingCost,
  };
}

/** Checkout shipping from selected method; validates id server-side. */
export function computeCheckoutShippingCost(
  subtotal: number,
  shippingMethod: string,
  opts?: Omit<CheckoutShippingQuoteInput, "merchandiseSubtotal" | "shippingMethod">
): number {
  return computeCheckoutShippingQuote({
    merchandiseSubtotal: subtotal,
    shippingMethod,
    ...opts,
  }).shippingCost;
}

export function computeMarketplaceOrderTotal(
  subtotal: number,
  discountAmount: number,
  shippingCost: number
): number {
  const total = subtotal - discountAmount + shippingCost;
  return Math.round(Math.max(0, total) * 100) / 100;
}

/** Whether payment is captured at checkout (vs COD / bank transfer pending). */
export function isMarketplacePaymentCaptured(
  paymentMethod: MarketplacePaymentMethodForShipping
): boolean {
  return paymentMethod === "card" || paymentMethod === "gcash";
}

export function marketplaceOrderStatusForPayment(
  paymentMethod: MarketplacePaymentMethodForShipping
): "paid" | "pending" {
  return isMarketplacePaymentCaptured(paymentMethod) ? "paid" : "pending";
}
