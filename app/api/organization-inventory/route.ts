import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { assertInventoryAccessForUser } from "@/lib/organization/capabilities";
import { getOrgInventory } from "@/lib/services/organizationInventory.service";
import { successResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { orgCapabilityErrorResponse } from "@/lib/utils/orgCapabilityErrors";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    let organizationId =
      req.user.role === "ORG_ADMIN"
        ? (req.user.organizationId ?? undefined)
        : (searchParams.get("organizationId") ?? undefined);

    if (req.user.role === "ORG_ADMIN" && req.user.organizationId) {
      const caps = await assertInventoryAccessForUser(req.user);
      if (caps?.inventorySurface !== "organization") {
        return successResponse([]);
      }
      organizationId = req.user.organizationId;
    }

    const inventory = await getOrgInventory(organizationId);
    return successResponse(inventory);
  } catch (err) {
    const capErr = orgCapabilityErrorResponse(err);
    if (capErr) return capErr;
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(
  withPermission("manage:inventory", { allowRoles: ["ORG_ADMIN"] })(getHandler)
);
