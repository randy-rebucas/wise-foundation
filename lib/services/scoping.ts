import type { SessionUser } from "@/types";

/**
 * Shared org/branch scoping for Prisma queries.
 *
 * This is the single place that decides "what rows can this user see/touch"
 * for models carrying both `organizationId` and `branchId`. Every service
 * function — reads AND mutations — must build its WHERE clause through one
 * of these helpers rather than hand-writing `{ organizationId: ... }`
 * inline, so there is exactly one implementation to audit for the
 * cross-tenant scoping gaps this app has hit before (see
 * lib/services/purchaseOrder.service.ts's former buildPurchaseOrderListQuery,
 * generalized here).
 */

export type OrgBranchScopeOpts = {
  branchId?: string;
  organizationId?: string;
};

export type OrgBranchWhere = {
  deletedAt?: null;
  organizationId?: string;
  branchId?: string | null;
  OR?: Array<{ branchId?: string | { in: string[] } | null }>;
};

export type ScopeRole = "ADMIN" | "ORG_ADMIN" | "BRANCH_SCOPED";

export type ScopeRoleResolver = (user: SessionUser) => ScopeRole | null;

/**
 * Build an org/branch WHERE clause for a Prisma model that carries both
 * `organizationId` and `branchId` columns.
 *
 * - `ADMIN` (or any role the caller's `resolveRole` maps to "ADMIN"): unscoped,
 *   optionally narrowed by the caller-supplied filters.
 * - `ORG_ADMIN` (org-level roles): pinned to `user.organizationId`.
 * - `BRANCH_SCOPED` (branch staff): pinned to `user.branchIds`; a user with no
 *   branch assignments only sees org-less/branch-less rows (`branchId: null`).
 *
 * Returns `null` when the user has no route to any rows at all (caller
 * should treat this as "forbidden", not "no rows match" — a null query object
 * must never be executed as an unscoped Prisma `findMany({})`).
 */
export function buildOrgBranchScope(
  user: SessionUser,
  resolveRole: ScopeRoleResolver,
  opts?: OrgBranchScopeOpts,
  extraWhere?: Record<string, unknown>
): OrgBranchWhere | null {
  const where: OrgBranchWhere = { deletedAt: null, ...extraWhere };
  const role = resolveRole(user);
  if (!role) return null;

  if (role === "ADMIN") {
    if (opts?.branchId) where.branchId = opts.branchId;
    if (opts?.organizationId) where.organizationId = opts.organizationId;
    return where;
  }

  if (role === "ORG_ADMIN") {
    if (!user.organizationId) return null;
    where.organizationId = user.organizationId;
    return where;
  }

  // BRANCH_SCOPED
  const branchIds = (user.branchIds ?? []).map(String).filter(Boolean);
  if (branchIds.length === 0) {
    where.branchId = null;
    return where;
  }

  if (opts?.branchId) {
    if (!branchIds.includes(opts.branchId)) return null;
    where.branchId = opts.branchId;
    return where;
  }

  where.OR = [{ branchId: { in: branchIds } }, { branchId: null }];
  return where;
}

/**
 * Scope helper for models keyed only by `organizationId` (no branch column),
 * e.g. Commission, OrganizationInventory-adjacent aggregates.
 */
export function buildOrgOnlyScope(
  user: SessionUser,
  resolveRole: ScopeRoleResolver,
  organizationIdFilter?: string,
  extraWhere?: Record<string, unknown>
): Record<string, unknown> | null {
  const where: Record<string, unknown> = { ...extraWhere };
  const role = resolveRole(user);
  if (!role) return null;

  if (role === "ADMIN") {
    if (organizationIdFilter) where.organizationId = organizationIdFilter;
    return where;
  }

  if (!user.organizationId) return null;
  if (organizationIdFilter && organizationIdFilter !== user.organizationId) return null;
  where.organizationId = user.organizationId;
  return where;
}

/**
 * Scope helper for models with a `branchId` column but no `organizationId`
 * column of their own (e.g. Inventory), where org-scoped roles must be
 * translated to "branches under this org" by the caller before invoking
 * this, since the org->branch relationship isn't visible here.
 */
export function buildBranchOnlyScope(
  user: SessionUser,
  resolveRole: ScopeRoleResolver,
  allowedBranchIds: string[] | null,
  branchIdFilter?: string
): Record<string, unknown> | null {
  const role = resolveRole(user);
  if (!role) return null;

  if (role === "ADMIN") {
    return branchIdFilter ? { branchId: branchIdFilter } : {};
  }

  const branchIds = allowedBranchIds ?? [];
  if (branchIdFilter) {
    if (!branchIds.includes(branchIdFilter)) return null;
    return { branchId: branchIdFilter };
  }
  if (branchIds.length === 0) return { branchId: null };
  return { branchId: { in: branchIds } };
}

/**
 * `StockMovement`-style scoping: a row is visible if the user's org/branch
 * matches ANY of the movement's org/branch reference columns (direct,
 * from-, or to-). Must stay an explicit OR across all reference columns —
 * do not simplify to a single organizationId/branchId check.
 */
export function buildOrgOrBranchTransferScope(
  organizationId: string | undefined,
  branchIds: string[]
): Record<string, unknown> {
  const or: Record<string, unknown>[] = [];
  if (organizationId) {
    or.push(
      { organizationId },
      { fromOrganizationId: organizationId },
      { toOrganizationId: organizationId }
    );
  }
  if (branchIds.length > 0) {
    or.push(
      { branchId: { in: branchIds } },
      { fromBranchId: { in: branchIds } },
      { toBranchId: { in: branchIds } }
    );
  }
  return or.length > 0 ? { OR: or } : {};
}
