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

export type PaymentTermsInstallment = {
  installmentNumber: number;
  dueDate: string;
  amount: number;
};

export type PaymentTermsSchedule = {
  months: PurchaseOrderPaymentTermsMonths;
  total: number;
  /** Typical monthly amount (last installment may differ by rounding). */
  installmentAmount: number;
  installments: PaymentTermsInstallment[];
  firstDueDate: string;
  finalDueDate: string;
};

/** Add whole calendar months, preserving day-of-month when possible. */
export function addCalendarMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDayOfMonth));
  return d;
}

export function toISODateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Split PO total into equal monthly installments (3 or 6).
 * First payment is due one month after `termsStartDate` (defaults to today).
 */
export function computePaymentTermsSchedule(params: {
  total: number;
  paymentTermsMonths?: PurchaseOrderPaymentTermsMonths | null;
  termsStartDate?: Date | string | null;
}): PaymentTermsSchedule | null {
  const months = params.paymentTermsMonths;
  if (months !== 3 && months !== 6) return null;

  const total = Math.max(0, params.total);
  if (total <= 0) return null;

  const start =
    params.termsStartDate != null && params.termsStartDate !== ""
      ? new Date(params.termsStartDate)
      : new Date();
  if (Number.isNaN(start.getTime())) return null;

  const perMonth = Math.round((total / months) * 100) / 100;
  const installments: PaymentTermsInstallment[] = [];
  let allocated = 0;

  for (let i = 1; i <= months; i++) {
    const due = addCalendarMonths(start, i);
    const amount =
      i === months ? Math.round((total - allocated) * 100) / 100 : perMonth;
    allocated = Math.round((allocated + amount) * 100) / 100;
    installments.push({
      installmentNumber: i,
      dueDate: toISODateOnly(due),
      amount,
    });
  }

  return {
    months,
    total,
    installmentAmount: perMonth,
    installments,
    firstDueDate: installments[0]!.dueDate,
    finalDueDate: installments[installments.length - 1]!.dueDate,
  };
}
