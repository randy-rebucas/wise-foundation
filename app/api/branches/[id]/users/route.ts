import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getBranchUsers, assignUserToBranch, removeUserFromBranch } from "@/lib/services/branch.service";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import { assertBranchAccess } from "@/lib/utils/branchAccess";
import { branchAccessErrorResponse } from "@/lib/utils/apiBranchErrors";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    await assertBranchAccess(req.user, id);
    const users = await getBranchUsers(id);
    return successResponse(users);
  } catch (error) {
    const branchErr = branchAccessErrorResponse(error);
    if (branchErr) return branchErr;
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    await assertBranchAccess(req.user, id);
    const body = await req.json();
    if (!body.userId) return errorResponse("userId is required");
    await assignUserToBranch(body.userId, id, { id: req.user.id, name: req.user.name });
    return successResponse(null, "User assigned to branch");
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
    const body = await req.json();
    if (!body.userId) return errorResponse("userId is required");
    await removeUserFromBranch(body.userId, id, { id: req.user.id, name: req.user.name });
    return successResponse(null, "User removed from branch");
  } catch (error) {
    const branchErr = branchAccessErrorResponse(error);
    if (branchErr) return branchErr;
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:branches")(getHandler));
export const POST = withStaffAuth(withPermission("manage:branches")(postHandler));
export const DELETE = withStaffAuth(withPermission("manage:branches")(deleteHandler));
