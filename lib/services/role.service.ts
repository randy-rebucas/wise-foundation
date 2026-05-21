import { connectDB } from "@/lib/db/connect";
import { Role } from "@/lib/db/models/Role";
import { User } from "@/lib/db/models/User";
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
  /** Upsert Role documents from code defaults. Default true. */
  syncRoles?: boolean;
  /** Set each user's `permissions` to their role defaults. Default true. */
  syncUsers?: boolean;
}

/** Permissions stored on the Role document, falling back to code defaults. */
export async function getRolePermissions(role: UserRole): Promise<string[]> {
  await connectDB();
  const doc = await Role.findOne({ name: role, deletedAt: null }).select("permissions").lean();
  if (doc?.permissions?.length) {
    return [...doc.permissions];
  }
  return getSystemRolePermissions(role);
}

export async function listRoles() {
  await connectDB();
  return Role.find({ deletedAt: null }).sort({ name: 1 }).lean();
}

/**
 * Align MongoDB Role documents and (optionally) user permission arrays with
 * {@link DEFAULT_ROLE_PERMISSIONS} in `lib/permissions.ts`.
 */
export async function syncRolesAndPermissions(
  options: SyncRolesOptions = {}
): Promise<SyncRolesResult> {
  const { syncRoles = true, syncUsers = true } = options;
  await connectDB();

  let rolesUpserted = 0;
  let usersUpdated = 0;

  if (syncRoles) {
    for (const def of SYSTEM_ROLE_DEFINITIONS) {
      await Role.findOneAndUpdate(
        { name: def.name },
        {
          $set: {
            displayName: def.displayName,
            permissions: def.permissions,
            isSystem: true,
            deletedAt: null,
          },
        },
        { upsert: true }
      );
      rolesUpserted += 1;
    }
  }

  if (syncUsers) {
    for (const def of SYSTEM_ROLE_DEFINITIONS) {
      const result = await User.updateMany(
        { role: def.name, deletedAt: null },
        { $set: { permissions: def.permissions } }
      );
      usersUpdated += result.modifiedCount;
    }
  }

  return {
    rolesUpserted,
    usersUpdated,
    roleNames: SYSTEM_ROLE_DEFINITIONS.map((r) => r.name),
  };
}
