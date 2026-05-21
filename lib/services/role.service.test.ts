import { describe, expect, it } from "vitest";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";
import { SYSTEM_ROLE_DEFINITIONS, SYSTEM_ROLE_DISPLAY_NAMES } from "@/lib/roles/systemRoles";
import { getSystemRolePermissions } from "@/lib/roles/rolePermissions";
import type { UserRole } from "@/types";

describe("system roles", () => {
  it("defines every UserRole in DEFAULT_ROLE_PERMISSIONS", () => {
    const names = SYSTEM_ROLE_DEFINITIONS.map((r) => r.name).sort();
    const expected = (Object.keys(DEFAULT_ROLE_PERMISSIONS) as UserRole[]).sort();
    expect(names).toEqual(expected);
  });

  it("matches permission lists in code", () => {
    for (const def of SYSTEM_ROLE_DEFINITIONS) {
      expect(def.permissions).toEqual(DEFAULT_ROLE_PERMISSIONS[def.name]);
    }
  });

  it("has display names for all roles", () => {
    for (const def of SYSTEM_ROLE_DEFINITIONS) {
      expect(SYSTEM_ROLE_DISPLAY_NAMES[def.name]).toBe(def.displayName);
    }
  });
});

describe("getSystemRolePermissions", () => {
  it("returns a copy of role defaults", () => {
    const perms = getSystemRolePermissions("ORG_ADMIN");
    expect(perms).toContain("manage:inventory");
    perms.push("extra:test");
    expect(getSystemRolePermissions("ORG_ADMIN")).not.toContain("extra:test");
  });
});
