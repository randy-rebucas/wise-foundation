import { describe, expect, it } from "vitest";
import { assertCanEditDraftPurchaseOrder } from "@/lib/purchaseOrders/draftEdit";
import type { SessionUser } from "@/types";

function user(partial: Partial<SessionUser> & Pick<SessionUser, "role">): SessionUser {
  return {
    id: "creator-1",
    name: "Creator",
    email: "c@test.com",
    branchIds: [],
    permissions: ["submit:org_orders"],
    organizationId: "507f1f77bcf86cd799439011",
    ...partial,
  } as SessionUser;
}

describe("assertCanEditDraftPurchaseOrder", () => {
  it("allows org admin to edit own draft", () => {
    expect(() =>
      assertCanEditDraftPurchaseOrder(
        { status: "draft", createdBy: "creator-1" },
        user({ role: "ORG_ADMIN", id: "creator-1" })
      )
    ).not.toThrow();
  });

  it("blocks org admin from editing another users draft", () => {
    expect(() =>
      assertCanEditDraftPurchaseOrder(
        { status: "draft", createdBy: "other-user" },
        user({ role: "ORG_ADMIN", id: "creator-1" })
      )
    ).toThrow(/only edit your own draft/);
  });

  it("allows inventory staff to edit any draft in scope", () => {
    expect(() =>
      assertCanEditDraftPurchaseOrder(
        { status: "draft", createdBy: "other-user" },
        user({
          role: "INVENTORY_MANAGER",
          id: "staff-1",
          permissions: ["manage:inventory"],
        })
      )
    ).not.toThrow();
  });

  it("rejects edit on non-draft PO", () => {
    expect(() =>
      assertCanEditDraftPurchaseOrder(
        { status: "submitted", createdBy: "creator-1" },
        user({ role: "ORG_ADMIN", id: "creator-1" })
      )
    ).toThrow(/Only draft/);
  });
});
