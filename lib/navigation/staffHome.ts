import { hasPermission } from "@/lib/permissions";
import type { UserRole } from "@/types";

export type StaffHomeUser = {
  role: UserRole | string;
  permissions?: string[] | null;
  organizationId?: string | null;
};

/** Default landing route after staff sign-in (and for role-only dashboard links). */
export function getStaffHomePath(user: StaffHomeUser): string {
  const role = user.role as UserRole;

  switch (role) {
    case "ADMIN":
      return "/dashboard";
    case "ORG_ADMIN":
      return user.organizationId ? "/org-dashboard" : "/org-panel";
    case "INVENTORY_MANAGER":
      if (hasPermission(user, "manage:inventory")) return "/inventory";
      if (hasPermission(user, "submit:org_orders")) return "/purchase-orders";
      return "/products";
    case "BRANCH_MANAGER":
    case "STAFF":
      if (hasPermission(user, "use:pos")) return "/pos";
      if (hasPermission(user, "manage:orders")) return "/orders";
      return "/settings";
    case "MEMBER":
    case "CUSTOMER":
      return "/account";
    default:
      return "/settings";
  }
}

const ROLE_EXCLUSIVE_PREFIXES: ReadonlyArray<{ prefix: string; roles: readonly UserRole[] }> = [
  { prefix: "/dashboard", roles: ["ADMIN"] },
  { prefix: "/org-dashboard", roles: ["ORG_ADMIN"] },
  { prefix: "/org-panel", roles: ["ORG_ADMIN"] },
  { prefix: "/admin/organizations", roles: ["ADMIN"] },
  { prefix: "/deliveries", roles: ["ADMIN"] },
];

function isRoleExclusivePath(pathname: string, role: UserRole): boolean {
  for (const { prefix, roles } of ROLE_EXCLUSIVE_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return !roles.includes(role);
    }
  }
  return false;
}

/**
 * Picks a safe post-login path: honors callbackUrl when allowed, otherwise role home.
 */
export function resolveStaffRedirectPath(
  user: StaffHomeUser,
  callbackUrl?: string | null
): string {
  const home = getStaffHomePath(user);
  const raw = callbackUrl?.trim();
  if (!raw || !raw.startsWith("/")) return home;

  if (raw.startsWith("/account") || raw === "/login" || raw.startsWith("/api/")) {
    return home;
  }

  if (isRoleExclusivePath(raw, user.role as UserRole)) {
    return home;
  }

  return raw;
}

export function getStaffHomeLabel(role: UserRole | string): string {
  switch (role as UserRole) {
    case "ADMIN":
      return "Dashboard";
    case "ORG_ADMIN":
      return "Org dashboard";
    case "INVENTORY_MANAGER":
      return "Inventory";
    case "BRANCH_MANAGER":
    case "STAFF":
      return "POS";
    default:
      return "Operations";
  }
}
