import { describe, expect, it } from "vitest";
import {
  computeCartStyleShipping,
  computeCheckoutShippingCost,
  computeCheckoutShippingQuote,
  computeMarketplaceOrderTotal,
  getCheckoutShippingMethodsForAddress,
  isMarketplacePaymentCaptured,
  marketplaceOrderStatusForPayment,
} from "./marketplaceShipping";

describe("marketplaceShipping", () => {
  it("cart shipping is free over threshold", () => {
    expect(computeCartStyleShipping(2500)).toBe(0);
    expect(computeCartStyleShipping(2499)).toBe(99);
  });

  it("J&T economy NCR light parcel without COD", () => {
    const q = computeCheckoutShippingQuote({
      merchandiseSubtotal: 800,
      shippingMethod: "jt_economy",
      region: "Metro Manila",
      city: "Quezon City",
      paymentMethod: "card",
    });
    expect(q.baseShipping).toBe(89);
    expect(q.codFee).toBe(0);
    expect(q.shippingCost).toBe(89);
  });

  it("J&T COD includes courier service fee", () => {
    const q = computeCheckoutShippingQuote({
      merchandiseSubtotal: 1000,
      shippingMethod: "jt_economy",
      region: "Metro Manila",
      city: "Manila",
      paymentMethod: "cash",
    });
    expect(q.baseShipping).toBe(89);
    expect(q.codFee).toBe(32.67);
    expect(q.shippingCost).toBe(121.67);
  });

  it("Flash provincial Luzon medium tier", () => {
    const q = computeCheckoutShippingQuote({
      merchandiseSubtotal: 2000,
      shippingMethod: "flash_standard",
      region: "Laguna",
      city: "Calamba",
      paymentMethod: "gcash",
    });
    expect(q.baseShipping).toBe(159);
    expect(q.shippingCost).toBe(159);
  });

  it("Lalamove is Metro Manila only", () => {
    expect(() =>
      computeCheckoutShippingQuote({
        merchandiseSubtotal: 500,
        shippingMethod: "lalamove_same_day",
        region: "Cebu",
        city: "Cebu City",
      })
    ).toThrow(/Metro Manila/i);
  });

  it("legacy shipping method ids map to carriers", () => {
    expect(computeCheckoutShippingCost(1000, "standard", { region: "NCR", paymentMethod: "card" })).toBe(
      89
    );
  });

  it("rejects invalid shipping method", () => {
    expect(() => computeCheckoutShippingCost(100, "invalid")).toThrow();
  });

  it("filters COD-incompatible methods when paying cash", () => {
    const methods = getCheckoutShippingMethodsForAddress("Metro Manila", "Makati", "cash");
    expect(methods.map((m) => m.id)).toEqual(["jt_economy", "flash_standard"]);
  });

  it("order total includes discount and shipping", () => {
    expect(computeMarketplaceOrderTotal(1000, 100, 122)).toBe(1022);
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
