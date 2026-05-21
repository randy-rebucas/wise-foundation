import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { listRoles } from "@/lib/services/role.service";
import { SYSTEM_ROLE_DEFINITIONS } from "@/lib/roles/systemRoles";
import { successResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (_req: AuthedRequest) => {
  try {
    const dbRoles = await listRoles();
    return successResponse({
      codeDefaults: SYSTEM_ROLE_DEFINITIONS,
      database: dbRoles,
    });
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:roles")(getHandler));
