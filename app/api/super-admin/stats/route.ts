import { withSuperAdmin } from "@/lib/middleware/withSuperAdmin";
import { getSystemStats } from "@/lib/services/superadmin.service";
import { successResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (_req: AuthedRequest) => {
  try {
    const stats = await getSystemStats();
    return successResponse(stats);
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withSuperAdmin(getHandler);
