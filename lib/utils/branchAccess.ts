import { prisma } from "@/lib/db/prisma";
import { isPlatformAdmin } from "@/lib/permissions";
import type { SessionUser } from "@/types";

export class BranchAccessDeniedError extends Error {
  constructor(message = "You do not have access to this branch") {
    super(message);
    this.name = "BranchAccessDeniedError";
  }
}

export type BranchScopeUser = Pick<SessionUser, "role" | "branchIds" | "organizationId">;

/** Throws {@link BranchAccessDeniedError} when the user may not use this branch. */
export async function assertBranchAccess(user: BranchScopeUser, branchId: string): Promise<void> {
  const id = branchId.trim();
  if (!id) throw new BranchAccessDeniedError("Branch ID is required");

  if (isPlatformAdmin(user.role)) return;

  const branch = await prisma.branch.findFirst({
    where: { id, deletedAt: null },
    select: { organizationId: true },
  });
  if (!branch) throw new BranchAccessDeniedError("Branch not found");

  if (user.role === "ORG_ADMIN") {
    const org = user.organizationId;
    if (!org || branch.organizationId !== org) {
      throw new BranchAccessDeniedError("Branch is not in your organization");
    }
    return;
  }

  if (!(user.branchIds ?? []).includes(id)) {
    throw new BranchAccessDeniedError();
  }
}

/** Validates access when a branch id is present; returns the trimmed id or null. */
export async function requireBranchAccessIfPresent(
  user: BranchScopeUser,
  branchId: string | null | undefined
): Promise<string | null> {
  const trimmed = branchId?.trim();
  if (!trimmed) return null;
  await assertBranchAccess(user, trimmed);
  return trimmed;
}

export function isBranchAccessDeniedError(err: unknown): err is BranchAccessDeniedError {
  return err instanceof BranchAccessDeniedError;
}
