import { describe, expect, it } from "vitest";
import { getStaffHomePath, resolveStaffRedirectPath } from "@/lib/navigation/staffHome";

describe("getStaffHomePath", () => {
  it("sends platform admin to /dashboard", () => {
    expect(getStaffHomePath({ role: "ADMIN", permissions: [] })).toBe("/dashboard");
  });

  it("sends org admin with org to /org-dashboard", () => {
    expect(
      getStaffHomePath({ role: "ORG_ADMIN", organizationId: "org1", permissions: [] })
    ).toBe("/org-dashboard");
  });

  it("sends org admin without org to /org-panel", () => {
    expect(getStaffHomePath({ role: "ORG_ADMIN", permissions: [] })).toBe("/org-panel");
  });

  it("sends cashier staff to POS", () => {
    expect(getStaffHomePath({ role: "STAFF", permissions: ["use:pos"] })).toBe("/pos");
  });

  it("sends inventory manager to inventory", () => {
    expect(
      getStaffHomePath({ role: "INVENTORY_MANAGER", permissions: ["manage:inventory"] })
    ).toBe("/inventory");
  });
});

describe("resolveStaffRedirectPath", () => {
  it("rejects /dashboard callback for org admin", () => {
    expect(
      resolveStaffRedirectPath(
        { role: "ORG_ADMIN", organizationId: "x", permissions: [] },
        "/dashboard"
      )
    ).toBe("/org-dashboard");
  });

  it("keeps allowed deep link for admin", () => {
    expect(
      resolveStaffRedirectPath({ role: "ADMIN", permissions: [] }, "/products")
    ).toBe("/products");
  });
});
