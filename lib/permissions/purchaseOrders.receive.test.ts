import { describe, expect, it } from "vitest";
import { canReceivePurchaseOrder } from "@/lib/permissions/purchaseOrders";
import type { SessionUser } from "@/types";

const orgAdmin: SessionUser = {
  id: "u1",
  name: "Org Admin",
  email: "org@example.com",
  role: "ORG_ADMIN",
  permissions: ["submit:org_orders"],
  branchIds: [],
  organizationId: "org1",
};

const inventoryStaff: SessionUser = {
  id: "s1",
  name: "Staff",
  email: "staff@example.com",
  role: "BRANCH_MANAGER",
  permissions: ["manage:inventory"],
  branchIds: ["branch1"],
};

const orgPo = { organizationId: "org1", branchId: null };
const branchPo = { organizationId: "org1", branchId: "branch1" };

describe("canReceivePurchaseOrder", () => {
  it("allows org admin to receive their org delivery (no branch)", () => {
    expect(canReceivePurchaseOrder(orgAdmin, orgPo)).toBe(true);
  });

  it("denies org admin for another org", () => {
    expect(canReceivePurchaseOrder(orgAdmin, { organizationId: "org2", branchId: null })).toBe(
      false
    );
  });

  it("denies org admin for branch-targeted POs", () => {
    expect(canReceivePurchaseOrder(orgAdmin, branchPo)).toBe(false);
  });

  it("allows inventory staff for branch POs", () => {
    expect(canReceivePurchaseOrder(inventoryStaff, branchPo)).toBe(true);
  });

  it("denies inventory staff for org delivery POs", () => {
    expect(canReceivePurchaseOrder(inventoryStaff, orgPo)).toBe(false);
  });
});
