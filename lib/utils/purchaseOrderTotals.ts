/** Allowed purchase-order payment terms (monthly installment counts or weekly). */
export const PURCHASE_ORDER_PAYMENT_TERMS_MONTHS = [3, 6] as const;
export const PURCHASE_ORDER_PAYMENT_TERMS_WEEKLY = "weekly" as const;

export type PurchaseOrderPaymentTermsMonths =
  | (typeof PURCHASE_ORDER_PAYMENT_TERMS_MONTHS)[number]
  | typeof PURCHASE_ORDER_PAYMENT_TERMS_WEEKLY;

export function isPurchaseOrderPaymentTerms(
  value: unknown
): value is PurchaseOrderPaymentTermsMonths {
  return value === 3 || value === 6 || value === PURCHASE_ORDER_PAYMENT_TERMS_WEEKLY;
}

export function formatPurchaseOrderPaymentTerms(
  terms: PurchaseOrderPaymentTermsMonths | null | undefined
): string | null {
  if (terms === 3) return "3 months";
  if (terms === 6) return "6 months";
  if (terms === PURCHASE_ORDER_PAYMENT_TERMS_WEEKLY) return "Weekly";
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
  terms: PurchaseOrderPaymentTermsMonths;
  total: number;
  /** Per-installment amount (monthly split or full total for weekly). */
  installmentAmount: number;
  installments: PaymentTermsInstallment[];
  firstDueDate: string;
  finalDueDate: string;
  /** Human-readable cadence for UI copy. */
  cadenceLabel: string;
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

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Build payment schedule: 3/6 monthly installments (due monthly from start) or weekly (full balance due in 7 days).
 */
export function computePaymentTermsSchedule(params: {
  total: number;
  paymentTermsMonths?: PurchaseOrderPaymentTermsMonths | null;
  termsStartDate?: Date | string | null;
}): PaymentTermsSchedule | null {
  const terms = params.paymentTermsMonths;
  if (!isPurchaseOrderPaymentTerms(terms)) return null;

  const total = Math.max(0, params.total);
  if (total <= 0) return null;

  const start =
    params.termsStartDate != null && params.termsStartDate !== ""
      ? new Date(params.termsStartDate)
      : new Date();
  if (Number.isNaN(start.getTime())) return null;

  if (terms === PURCHASE_ORDER_PAYMENT_TERMS_WEEKLY) {
    const dueDate = toISODateOnly(addDays(start, 7));
    return {
      terms,
      total,
      installmentAmount: total,
      installments: [{ installmentNumber: 1, dueDate, amount: total }],
      firstDueDate: dueDate,
      finalDueDate: dueDate,
      cadenceLabel: "weekly",
    };
  }

  const months = terms;
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
    terms,
    total,
    installmentAmount: perMonth,
    installments,
    firstDueDate: installments[0]!.dueDate,
    finalDueDate: installments[installments.length - 1]!.dueDate,
    cadenceLabel: "monthly",
  };
}
