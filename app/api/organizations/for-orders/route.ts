import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getOrganizationsForOrderContext } from "@/lib/services/organization.service";
import { successResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const orgs = await getOrganizationsForOrderContext(req.user);
    return successResponse(orgs);
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:orders")(getHandler));
