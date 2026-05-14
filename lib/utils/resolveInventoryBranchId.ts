import { connectDB } from "@/lib/db/connect";
import { Branch } from "@/lib/db/models/Branch";
import type { UserRole } from "@/types";

type BranchUser = {
  branchIds: string[];
  role: UserRole;
};

/**
 * Resolves which branch to use for branch-scoped inventory APIs.
 * Order: explicit id → user's first assigned branch → (ADMIN only) first active branch in DB.
 */
export async function resolveInventoryBranchId(
  preferredBranchId: string | null | undefined,
  user: BranchUser
): Promise<string | null> {
  const trimmed = preferredBranchId?.trim();
  if (trimmed) return trimmed;
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
