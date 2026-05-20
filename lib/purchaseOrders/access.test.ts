import { describe, expect, it } from "vitest";
import { canUserAccessPurchaseOrder } from "@/lib/purchaseOrders/access";
import type { SessionUser } from "@/types";

const orgA = "507f1f77bcf86cd799439011";
const orgB = "507f1f77bcf86cd799439012";
const branchX = "507f1f77bcf86cd799439013";

function user(partial: Partial<SessionUser> & Pick<SessionUser, "role">): SessionUser {
  return {
    id: "user-1",
    name: "Test",
    email: "t@test.com",
    branchIds: [],
    permissions: [],
    ...partial,
  } as SessionUser;
}

describe("canUserAccessPurchaseOrder", () => {
  it("allows ADMIN for any PO", () => {
    expect(
      canUserAccessPurchaseOrder(
        { organizationId: orgB, branchId: branchX },
        user({ role: "ADMIN" })
      )
    ).toBe(true);
  });

  it("scopes ORG_ADMIN to their organization", () => {
    const orgAdmin = user({ role: "ORG_ADMIN", organizationId: orgA });
    expect(canUserAccessPurchaseOrder({ organizationId: orgA }, orgAdmin)).toBe(true);
    expect(canUserAccessPurchaseOrder({ organizationId: orgB }, orgAdmin)).toBe(false);
  });

  it("scopes branch staff to assigned branches when PO has branchId", () => {
    const manager = user({
      role: "BRANCH_MANAGER",
      branchIds: [branchX],
      permissions: ["manage:inventory"],
    });
    expect(canUserAccessPurchaseOrder({ branchId: branchX }, manager)).toBe(true);
    expect(
      canUserAccessPurchaseOrder({ branchId: "507f1f77bcf86cd799439099" }, manager)
    ).toBe(false);
  });

  it("allows inventory staff for org-level POs without branchId", () => {
    const staff = user({
      role: "INVENTORY_MANAGER",
      permissions: ["manage:inventory"],
    });
    expect(canUserAccessPurchaseOrder({ organizationId: orgA, branchId: null }, staff)).toBe(
      true
    );
  });

  it("denies staff without manage:inventory for org-level PO", () => {
    const staff = user({ role: "STAFF", permissions: ["use:pos"] });
    expect(canUserAccessPurchaseOrder({ organizationId: orgA }, staff)).toBe(false);
  });
});
