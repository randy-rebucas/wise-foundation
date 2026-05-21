import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";
import type { UserRole } from "@/types";

export const SYSTEM_ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  ADMIN: "Administrator",
  ORG_ADMIN: "Organization Admin",
  BRANCH_MANAGER: "Branch Manager",
  STAFF: "Staff",
  INVENTORY_MANAGER: "Inventory Manager",
  MEMBER: "Member",
  CUSTOMER: "Shop customer",
};

export interface SystemRoleDefinition {
  name: UserRole;
  displayName: string;
  permissions: string[];
  isSystem: true;
}

/** Canonical system roles derived from {@link DEFAULT_ROLE_PERMISSIONS}. */
export const SYSTEM_ROLE_DEFINITIONS: SystemRoleDefinition[] = (
  Object.keys(DEFAULT_ROLE_PERMISSIONS) as UserRole[]
).map((name) => ({
  name,
  displayName: SYSTEM_ROLE_DISPLAY_NAMES[name],
  permissions: [...DEFAULT_ROLE_PERMISSIONS[name]],
  isSystem: true as const,
}));
