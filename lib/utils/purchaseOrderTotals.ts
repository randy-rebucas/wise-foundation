/** Allowed purchase-order payment terms (months). */
export const PURCHASE_ORDER_PAYMENT_TERMS_MONTHS = [3, 6] as const;
export type PurchaseOrderPaymentTermsMonths =
  (typeof PURCHASE_ORDER_PAYMENT_TERMS_MONTHS)[number];

export function formatPurchaseOrderPaymentTerms(
  months: PurchaseOrderPaymentTermsMonths | null | undefined
): string | null {
  if (months === 3) return "3 months";
  if (months === 6) return "6 months";
  return null;
}

export function computePurchaseOrderTotals(
  lineSubtotal: number,
  discountPercent = 0
): {
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
} {
  const subtotal = Math.max(0, lineSubtotal);
  const pct = Math.min(100, Math.max(0, discountPercent));
  const discountAmount = Math.round((subtotal * pct) / 100 * 100) / 100;
  const total = Math.round((subtotal - discountAmount) * 100) / 100;
  return { subtotal, discountPercent: pct, discountAmount, total };
}
