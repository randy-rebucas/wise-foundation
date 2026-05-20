import { describe, expect, it } from "vitest";
import {
  detectCardBrand,
  isValidCardNumber,
  isValidExpiry,
  validateNewCardEntry,
} from "./cardPayment";

describe("cardPayment", () => {
  it("detects visa and mastercard", () => {
    expect(detectCardBrand("4111111111111111")).toBe("visa");
    expect(detectCardBrand("5555555555554444")).toBe("mastercard");
  });

  it("validates test visa number (Luhn)", () => {
    expect(isValidCardNumber("4111111111111111")).toBe(true);
    expect(isValidCardNumber("4111111111111112")).toBe(false);
  });

  it("validates expiry", () => {
    const futureYear = String((new Date().getFullYear() + 2) % 100).padStart(2, "0");
    expect(isValidExpiry("12", futureYear)).toBe(true);
    expect(isValidExpiry("01", "20")).toBe(false);
  });

  it("validateNewCardEntry succeeds for valid test card", () => {
    const futureYear = String((new Date().getFullYear() + 2) % 100).padStart(2, "0");
    const result = validateNewCardEntry({
      cardholderName: "Jane Doe",
      cardNumber: "4111111111111111",
      expMonth: "12",
      expYear: futureYear,
      cvv: "123",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resolved.cardLast4).toBe("1111");
      expect(result.resolved.cardBrand).toBe("visa");
    }
  });
});
