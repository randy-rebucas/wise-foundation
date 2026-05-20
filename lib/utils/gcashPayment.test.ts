import { describe, expect, it } from "vitest";
import {
  formatPhilippineMobileDisplay,
  isValidPhilippineMobile,
  normalizePhilippineMobile,
  validateGcashEntry,
} from "./gcashPayment";

describe("gcashPayment", () => {
  it("normalizes Philippine mobiles", () => {
    expect(normalizePhilippineMobile("09171234567")).toBe("09171234567");
    expect(normalizePhilippineMobile("+63 917 123 4567")).toBe("09171234567");
    expect(normalizePhilippineMobile("9171234567")).toBe("09171234567");
    expect(isValidPhilippineMobile("091234")).toBe(false);
  });

  it("formats display", () => {
    expect(formatPhilippineMobileDisplay("09171234567")).toBe("0917 123 4567");
  });

  it("validateGcashEntry", () => {
    const result = validateGcashEntry({
      accountName: "Juan Dela Cruz",
      mobileNumber: "09171234567",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resolved.mobileLast4).toBe("4567");
      expect(result.resolved.mobileMasked).toContain("4567".slice(-2));
    }
  });
});
