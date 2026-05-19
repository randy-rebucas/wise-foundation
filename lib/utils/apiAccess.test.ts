import { describe, expect, it } from "vitest";
import {
  isCustomerOrPublicApi,
  isStaffBlockedRole,
  STAFF_BLOCKED_ROLES,
} from "@/lib/utils/apiAccess";

describe("apiAccess", () => {
  it("treats marketplace and account APIs as customer/public namespace", () => {
    expect(isCustomerOrPublicApi("/api/marketplace/products")).toBe(true);
    expect(isCustomerOrPublicApi("/api/account/wishlist")).toBe(true);
    expect(isCustomerOrPublicApi("/api/auth/signin")).toBe(true);
    expect(isCustomerOrPublicApi("/api/setup")).toBe(true);
  });

  it("treats staff APIs as outside customer namespace", () => {
    expect(isCustomerOrPublicApi("/api/products")).toBe(false);
    expect(isCustomerOrPublicApi("/api/branches")).toBe(false);
    expect(isCustomerOrPublicApi("/api/products/images/status")).toBe(false);
  });

  it("blocks marketplace roles from staff APIs", () => {
    for (const role of STAFF_BLOCKED_ROLES) {
      expect(isStaffBlockedRole(role)).toBe(true);
    }
    expect(isStaffBlockedRole("STAFF")).toBe(false);
    expect(isStaffBlockedRole("ADMIN")).toBe(false);
  });
});
