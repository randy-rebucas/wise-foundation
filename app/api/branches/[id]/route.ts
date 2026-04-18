import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getBranchById, updateBranch, deleteBranch } from "@/lib/services/branch.service";
import { updateBranchSchema } from "@/lib/validations/branch.schema";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    const branch = await getBranchById(id);
    if (!branch) return notFoundResponse("Branch not found");
    return successResponse(branch);
  } catch {
    return serverErrorResponse();
  }
};

const patchHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    const body = await req.json();
    const parsed = updateBranchSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const branch = await updateBranch(id, parsed.data);
    if (!branch) return notFoundResponse("Branch not found");
    return successResponse(branch, "Branch updated");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    await deleteBranch(id);
    return successResponse(null, "Branch deleted");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withAuth(getHandler);
export const PATCH = withAuth(withPermission("manage:branches")(patchHandler));
export const DELETE = withAuth(withPermission("manage:branches")(deleteHandler));
