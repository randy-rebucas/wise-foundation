import type { SessionUser } from "@/types";

/**
 * Returns a MongoDB filter object that scopes queries to the user's organization.
 * ADMIN: no filter (sees all data)
 * ORG_ADMIN: scoped to their organizationId
 * Others: no org-level filter (already scoped by branchId in the calling service)
 */
export function getOrgFilter(user: SessionUser): Record<string, unknown> {
  if (user.role === "ORG_ADMIN" && user.organizationId) {
    return { organizationId: user.organizationId };
  }
  return {};
}

/**
 * Returns the organizationId to stamp on new records based on the user's role.
 * ORG_ADMIN: their organizationId
 * Others: null (branch-scoped records will get org from their branch lookup)
 */
export function getOrgId(user: SessionUser): string | null {
  if (user.role === "ORG_ADMIN" && user.organizationId) {
    return user.organizationId;
  }
  return null;
}
