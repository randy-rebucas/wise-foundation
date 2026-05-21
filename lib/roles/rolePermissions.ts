import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";
import type { UserRole } from "@/types";

/** Permissions for a role from code (authoritative until synced to DB). */
export function getSystemRolePermissions(role: UserRole): string[] {
  return [...(DEFAULT_ROLE_PERMISSIONS[role] ?? [])];
}
