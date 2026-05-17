import { isBranchAccessDeniedError } from "@/lib/utils/branchAccess";
import { errorResponse, forbiddenResponse } from "@/lib/utils/apiResponse";

export function branchAccessErrorResponse(err: unknown): Response | null {
  if (!isBranchAccessDeniedError(err)) return null;
  if (err.message === "Branch not found") {
    return errorResponse(err.message, 404);
  }
  return forbiddenResponse(err.message);
}
