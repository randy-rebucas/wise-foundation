import { describe, expect, it } from "vitest";
import {
  computeCartStyleShipping,
  computeCheckoutShippingCost,
  computeMarketplaceOrderTotal,
  isMarketplacePaymentCaptured,
  marketplaceOrderStatusForPayment,
} from "./marketplaceShipping";

describe("marketplaceShipping", () => {
  it("cart shipping is free over threshold", () => {
    expect(computeCartStyleShipping(2500)).toBe(0);
    expect(computeCartStyleShipping(2499)).toBe(99);
  });

  it("checkout shipping uses method price", () => {
    expect(computeCheckoutShippingCost(1000, "standard")).toBe(120);
    expect(computeCheckoutShippingCost(1000, "express")).toBe(250);
  });

  it("rejects invalid shipping method", () => {
    expect(() => computeCheckoutShippingCost(100, "invalid")).toThrow();
  });

  it("order total includes discount and shipping", () => {
    expect(computeMarketplaceOrderTotal(1000, 100, 120)).toBe(1020);
  });

  it("payment status by method", () => {
    expect(marketplaceOrderStatusForPayment("cash")).toBe("pending");
    expect(marketplaceOrderStatusForPayment("bank_transfer")).toBe("pending");
    expect(marketplaceOrderStatusForPayment("card")).toBe("paid");
    expect(marketplaceOrderStatusForPayment("gcash")).toBe("paid");
    expect(isMarketplacePaymentCaptured("card")).toBe(true);
    expect(isMarketplacePaymentCaptured("cash")).toBe(false);
  });
});
