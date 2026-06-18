import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getBranchById, updateBranch, deleteBranch, type UpdateBranchData } from "@/lib/services/branch.service";
import { updateBranchSchema } from "@/lib/validations/branch.schema";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import { assertBranchAccess } from "@/lib/utils/branchAccess";
import { branchAccessErrorResponse } from "@/lib/utils/apiBranchErrors";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    await assertBranchAccess(req.user, id);
    const branch = await getBranchById(id);
    if (!branch) return notFoundResponse("Branch not found");
    return successResponse(branch);
  } catch (err) {
    const branchErr = branchAccessErrorResponse(err);
    if (branchErr) return branchErr;
    return serverErrorResponse();
  }
};

const patchHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    await assertBranchAccess(req.user, id);
    const body = await req.json();
    const parsed = updateBranchSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const data = { ...parsed.data } as UpdateBranchData;
    if (req.user.role !== "ADMIN") {
      // Reassigning a branch's organization or flipping head-office status is a
      // platform-admin action — branch-scoped grants of manage:branches shouldn't move
      // a branch out of (or another org's branch into) their own scope.
      delete data.organizationId;
      delete data.isHeadOffice;
    }

    const branch = await updateBranch(id, data);
    if (!branch) return notFoundResponse("Branch not found");
    return successResponse(branch, "Branch updated");
  } catch (error) {
    const branchErr = branchAccessErrorResponse(error);
    if (branchErr) return branchErr;
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    await assertBranchAccess(req.user, id);
    await deleteBranch(id);
    return successResponse(null, "Branch deleted");
  } catch (error) {
    const branchErr = branchAccessErrorResponse(error);
    if (branchErr) return branchErr;
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:branches")(getHandler));
export const PATCH = withStaffAuth(withPermission("manage:branches")(patchHandler));
export const DELETE = withStaffAuth(withPermission("manage:branches")(deleteHandler));
