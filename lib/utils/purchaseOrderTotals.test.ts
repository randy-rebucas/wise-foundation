import { describe, expect, it } from "vitest";
import {
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
