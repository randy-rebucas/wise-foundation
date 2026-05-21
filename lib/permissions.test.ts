import { describe, expect, it } from "vitest";
import { effectivePermissions, hasPermission, hasAnyPermission } from "@/lib/permissions";

describe("permissions", () => {
  it("merges role defaults with user grants", () => {
    const perms = effectivePermissions({
      role: "STAFF",
      permissions: ["manage:products"],
    });
    expect(perms).toContain("use:pos");
    expect(perms).toContain("manage:products");
  });

  it("ADMIN bypasses permission checks", () => {
    expect(hasPermission({ role: "ADMIN", permissions: [] }, "manage:users")).toBe(true);
  });

  it("CUSTOMER has no staff permissions", () => {
    expect(hasPermission({ role: "CUSTOMER", permissions: [] }, "manage:products")).toBe(false);
  });

  it("ORG_ADMIN includes inventory, POS, and orders", () => {
    const perms = effectivePermissions({ role: "ORG_ADMIN", permissions: [] });
    expect(perms).toContain("manage:inventory");
    expect(perms).toContain("use:pos");
    expect(perms).toContain("manage:orders");
  });

  it("hasAnyPermission requires one match", () => {
    expect(
      hasAnyPermission({ role: "INVENTORY_MANAGER", permissions: [] }, "manage:products", "use:pos")
    ).toBe(true);
    expect(hasAnyPermission({ role: "CUSTOMER", permissions: [] }, "use:pos")).toBe(false);
  });
});
