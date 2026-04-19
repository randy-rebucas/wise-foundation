import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getOrgInventory } from "@/lib/services/organizationInventory.service";
import { successResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId =
      req.user.role === "ORG_ADMIN"
        ? (req.user.organizationId ?? undefined)
        : (searchParams.get("organizationId") ?? undefined);
    const inventory = await getOrgInventory(organizationId);
    return successResponse(inventory);
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withAuth(withPermission("manage:organizations", { allowRoles: ["ORG_ADMIN"] })(getHandler));
