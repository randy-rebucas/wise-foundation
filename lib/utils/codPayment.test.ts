import { describe, expect, it } from "vitest";
import { validateCodEntry } from "./codPayment";

describe("codPayment", () => {
  it("requires acknowledgment", () => {
    const result = validateCodEntry({ acknowledged: false, amountDue: 500 });
    expect(result.ok).toBe(false);
  });

  it("validates change amount", () => {
    const low = validateCodEntry({
      acknowledged: true,
      amountDue: 1000,
      prepareChangeFor: 500,
    });
    expect(low.ok).toBe(false);

    const ok = validateCodEntry({
      acknowledged: true,
      amountDue: 1000,
      prepareChangeFor: 1500,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.resolved.changeToReturn).toBe(500);
    }
  });
});
