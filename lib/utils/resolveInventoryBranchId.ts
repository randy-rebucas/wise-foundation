import { prisma } from "@/lib/db/prisma";
import { loadOrganizationCapabilitiesForUser } from "@/lib/organization/capabilities";
import { assertBranchAccess, type BranchScopeUser } from "@/lib/utils/branchAccess";

/**
 * Resolves which branch to use for branch-scoped inventory APIs.
 * Order: explicit id (access-checked) → user's first assigned branch → (ADMIN only) first active branch in DB.
 */
export async function resolveInventoryBranchId(
  preferredBranchId: string | null | undefined,
  user: BranchScopeUser
): Promise<string | null> {
  const trimmed = preferredBranchId?.trim();
  if (trimmed) {
    await assertBranchAccess(user, trimmed);
    return trimmed;
  }

  const fromUser = user.branchIds?.[0]?.trim();
  if (fromUser) {
    await assertBranchAccess(user, fromUser);
    return fromUser;
  }

  if (user.role === "ORG_ADMIN" && user.organizationId) {
    const caps = await loadOrganizationCapabilitiesForUser(user);
    if (caps?.posSurface === "branch" || caps?.inventorySurface === "branch") {
      const b = await prisma.branch.findFirst({
        where: { organizationId: user.organizationId, deletedAt: null, isActive: true },
        orderBy: [{ isHeadOffice: "desc" }, { name: "asc" }],
      });
      return b?.id ?? null;
    }
    return null;
  }

  if (user.role === "ADMIN") {
    const b = await prisma.branch.findFirst({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ isHeadOffice: "desc" }, { id: "asc" }],
    });
    return b?.id ?? null;
  }

  return null;
}
