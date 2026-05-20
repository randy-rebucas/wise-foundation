/** Shared marketplace shipping rules (cart + checkout + server validation). */

export const MARKETPLACE_FREE_SHIPPING_THRESHOLD = 2500;
export const MARKETPLACE_FLAT_SHIPPING_FEE = 99;

export const MARKETPLACE_SHIPPING_METHODS = [
  { id: "standard", title: "Standard Shipping", detail: "3-5 business days", price: 120 },
  { id: "express", title: "Express Shipping", detail: "1-2 business days", price: 250 },
  { id: "same_day", title: "Same Day Delivery (Metro Manila)", detail: "Order before 12nn", price: 350 },
] as const;

export type MarketplaceShippingMethodId =
  (typeof MARKETPLACE_SHIPPING_METHODS)[number]["id"];

export function getMarketplaceShippingOption(id: string) {
  return MARKETPLACE_SHIPPING_METHODS.find((o) => o.id === id);
}

/** Cart-style shipping: free over threshold, otherwise flat fee. */
export function computeCartStyleShipping(subtotal: number): number {
  return subtotal >= MARKETPLACE_FREE_SHIPPING_THRESHOLD ? 0 : MARKETPLACE_FLAT_SHIPPING_FEE;
}

/** Checkout shipping from selected method; validates id server-side. */
export function computeCheckoutShippingCost(
  subtotal: number,
  shippingMethod: string
): number {
  const option = getMarketplaceShippingOption(shippingMethod);
  if (!option) {
    throw new Error("Invalid shipping method");
  }
  return option.price;
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
  paymentMethod: "cash" | "gcash" | "card" | "bank_transfer" | "credit"
): boolean {
  return paymentMethod === "card" || paymentMethod === "gcash";
}

export function marketplaceOrderStatusForPayment(
  paymentMethod: "cash" | "gcash" | "card" | "bank_transfer" | "credit"
): "paid" | "pending" {
  return isMarketplacePaymentCaptured(paymentMethod) ? "paid" : "pending";
}
