import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getBranchUsers, assignUserToBranch, removeUserFromBranch } from "@/lib/services/branch.service";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const users = await getBranchUsers(id);
    return successResponse(users);
  } catch {
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const body = await req.json();
    if (!body.userId) return errorResponse("userId is required");
    await assignUserToBranch(body.userId, id);
    return successResponse(null, "User assigned to branch");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const body = await req.json();
    if (!body.userId) return errorResponse("userId is required");
    await removeUserFromBranch(body.userId, id);
    return successResponse(null, "User removed from branch");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withAuth(withPermission("manage:branches")(getHandler));
export const POST = withAuth(withPermission("manage:branches")(postHandler));
export const DELETE = withAuth(withPermission("manage:branches")(deleteHandler));
