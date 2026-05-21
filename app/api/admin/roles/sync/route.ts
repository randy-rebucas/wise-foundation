import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { syncRolesAndPermissions } from "@/lib/services/role.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const postHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json().catch(() => ({}));
    const syncRoles = body.syncRoles !== false;
    const syncUsers = body.syncUsers !== false;

    const result = await syncRolesAndPermissions({ syncRoles, syncUsers });
    return successResponse(result, "Roles and permissions synced");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const POST = withStaffAuth(withPermission("manage:roles")(postHandler));
