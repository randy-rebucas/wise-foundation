import { describe, expect, it } from "vitest";
import {
  addCalendarMonths,
  computePaymentTermsSchedule,
  computePurchaseOrderTotals,
  formatPurchaseOrderPaymentTerms,
} from "./purchaseOrderTotals";

describe("computePurchaseOrderTotals", () => {
  it("applies percentage discount to subtotal", () => {
    expect(computePurchaseOrderTotals(1000, 20)).toEqual({
      subtotal: 1000,
      discountPercent: 20,
      discountAmount: 200,
      total: 800,
    });
  });

  it("clamps discount percent to 0–100", () => {
    expect(computePurchaseOrderTotals(100, 150).discountPercent).toBe(100);
    expect(computePurchaseOrderTotals(100, -5).discountPercent).toBe(0);
  });
});

describe("formatPurchaseOrderPaymentTerms", () => {
  it("formats 3 and 6 month terms", () => {
    expect(formatPurchaseOrderPaymentTerms(3)).toBe("3 months");
    expect(formatPurchaseOrderPaymentTerms(6)).toBe("6 months");
    expect(formatPurchaseOrderPaymentTerms(null)).toBeNull();
  });
});

describe("computePaymentTermsSchedule", () => {
  it("splits total into equal installments with remainder on last", () => {
    const schedule = computePaymentTermsSchedule({
      total: 1000,
      paymentTermsMonths: 3,
      termsStartDate: "2026-01-15",
    });
    expect(schedule).not.toBeNull();
    expect(schedule!.installments).toHaveLength(3);
    expect(schedule!.installments[0]!.amount).toBe(333.33);
    expect(schedule!.installments[2]!.amount).toBe(333.34);
    expect(
      schedule!.installments.reduce((sum, row) => sum + row.amount, 0)
    ).toBe(1000);
    expect(schedule!.installments[0]!.dueDate).toBe("2026-02-15");
    expect(schedule!.installments[2]!.dueDate).toBe("2026-04-15");
  });

  it("returns null without terms or zero total", () => {
    expect(computePaymentTermsSchedule({ total: 500, paymentTermsMonths: null })).toBeNull();
    expect(computePaymentTermsSchedule({ total: 0, paymentTermsMonths: 6 })).toBeNull();
  });
});

describe("addCalendarMonths", () => {
  it("handles month-end dates", () => {
    const result = addCalendarMonths(new Date("2026-01-31"), 1);
    expect(result.toISOString().slice(0, 10)).toBe("2026-02-28");
  });
});
