import { describe, expect, it } from "vitest";
import { canManageCommissionPayouts } from "./commissionAccess";

describe("canManageCommissionPayouts", () => {
  it("allows platform ADMIN only", () => {
    expect(canManageCommissionPayouts("ADMIN")).toBe(true);
    expect(canManageCommissionPayouts("ORG_ADMIN")).toBe(false);
    expect(canManageCommissionPayouts("BRANCH_MANAGER")).toBe(false);
  });
});
