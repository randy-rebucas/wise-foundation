import { prisma } from "@/lib/db/prisma";
import { getSystemRolePermissions } from "@/lib/roles/rolePermissions";
import { SYSTEM_ROLE_DEFINITIONS } from "@/lib/roles/systemRoles";
import type { UserRole } from "@/types";

export { getSystemRolePermissions } from "@/lib/roles/rolePermissions";

export interface SyncRolesResult {
  rolesUpserted: number;
  usersUpdated: number;
  roleNames: string[];
}

export interface SyncRolesOptions {
  /** Upsert Role rows from code defaults. Default true. */
  syncRoles?: boolean;
  /** Set each user's `permissions` to their role defaults. Default true. */
  syncUsers?: boolean;
}

/** Permissions stored on the Role row, falling back to code defaults. */
export async function getRolePermissions(role: UserRole): Promise<string[]> {
  const doc = await prisma.role.findFirst({
    where: { name: role, deletedAt: null },
    select: { permissions: true },
  });
  if (doc?.permissions?.length) {
    return [...doc.permissions];
  }
  return getSystemRolePermissions(role);
}

export async function listRoles() {
  return prisma.role.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
}

/**
 * Align Role rows and (optionally) user permission arrays with
 * {@link DEFAULT_ROLE_PERMISSIONS} in `lib/permissions.ts`.
 */
export async function syncRolesAndPermissions(
  options: SyncRolesOptions = {}
): Promise<SyncRolesResult> {
  const { syncRoles = true, syncUsers = true } = options;

  let rolesUpserted = 0;
  let usersUpdated = 0;

  if (syncRoles) {
    for (const def of SYSTEM_ROLE_DEFINITIONS) {
      await prisma.role.upsert({
        where: { name: def.name },
        create: {
          name: def.name,
          displayName: def.displayName,
          permissions: def.permissions,
          isSystem: true,
        },
        update: {
          displayName: def.displayName,
          permissions: def.permissions,
          isSystem: true,
          deletedAt: null,
        },
      });
      rolesUpserted += 1;
    }
  }

  if (syncUsers) {
    for (const def of SYSTEM_ROLE_DEFINITIONS) {
      const result = await prisma.user.updateMany({
        where: { role: def.name, deletedAt: null },
        data: { permissions: def.permissions },
      });
      usersUpdated += result.count;
    }
  }

  return {
    rolesUpserted,
    usersUpdated,
    roleNames: SYSTEM_ROLE_DEFINITIONS.map((r) => r.name),
  };
}
