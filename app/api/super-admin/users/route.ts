import { withSuperAdmin } from "@/lib/middleware/withSuperAdmin";
import { getAllUsersAcrossTenants } from "@/lib/services/superadmin.service";
import { successResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "25");
    const search = searchParams.get("search") ?? undefined;
    const role = searchParams.get("role") ?? undefined;
    const tenantId = searchParams.get("tenantId") ?? undefined;

    const result = await getAllUsersAcrossTenants(page, limit, search, role, tenantId);
    return successResponse(result.users, undefined, 200, {
      page,
      limit,
      total: result.total,
      totalPages: result.pages,
    });
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withSuperAdmin(getHandler);
