import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getBranches, createBranch, type CreateBranchData } from "@/lib/services/branch.service";
import { createBranchSchema } from "@/lib/validations/branch.schema";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const organizationId =
      req.user.role === "ORG_ADMIN"
        ? (req.user.organizationId ?? undefined)
        : (searchParams.get("organizationId") ?? undefined);

    const result = await getBranches(page, limit, organizationId);
    return successResponse(result.branches, undefined, 200, {
      page,
      limit,
      total: result.total,
    });
  } catch {
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    const parsed = createBranchSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const branch = await createBranch(parsed.data as CreateBranchData);
    return successResponse(branch, "Branch created successfully", 201);
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withAuth(getHandler);
export const POST = withAuth(withPermission("manage:branches")(postHandler));
