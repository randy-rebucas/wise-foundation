import { connectDB } from "@/lib/db/connect";
import { Branch } from "@/lib/db/models/Branch";
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
  if (fromUser) return fromUser;

  if (user.role === "ADMIN") {
    await connectDB();
    const b = await Branch.findOne({ deletedAt: null, isActive: true })
      .sort({ isHeadOffice: -1, _id: 1 })
      .lean();
    return b?._id?.toString() ?? null;
  }

  return null;
}
