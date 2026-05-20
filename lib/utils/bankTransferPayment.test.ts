import { describe, expect, it } from "vitest";
import { validateBankTransferEntry } from "./bankTransferPayment";

describe("bankTransferPayment", () => {
  it("validates bank transfer entry", () => {
    const result = validateBankTransferEntry({
      depositorName: "Maria Santos",
      depositorBank: "BPI",
      accountLast4: "7890",
      transferReference: "REF123456",
      depositToBankId: "bpi",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resolved.accountLast4).toBe("7890");
      expect(result.resolved.depositToBankName).toBe("BPI");
    }
  });

  it("rejects missing reference", () => {
    const result = validateBankTransferEntry({
      depositorName: "Maria Santos",
      depositorBank: "BDO",
      accountLast4: "",
      transferReference: "ab",
      depositToBankId: "bdo",
    });
    expect(result.ok).toBe(false);
  });
});
