import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withAnyPermission } from "@/lib/middleware/withAnyPermission";
import { getOrganizationsForOrderContext } from "@/lib/services/organization.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const orgs = await getOrganizationsForOrderContext(req.user);
    return successResponse(orgs);
  } catch (error) {
    console.error("[GET /api/organizations/for-purchase-orders]", error);
    if (error instanceof Error) return errorResponse(error.message, 500);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(
  withAnyPermission("manage:inventory", "submit:org_orders")(getHandler)
);
