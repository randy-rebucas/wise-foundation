import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { assertInventoryAccessForUser } from "@/lib/organization/capabilities";
import { getOrgInventory } from "@/lib/services/organizationInventory.service";
import { successResponse, serverErrorResponse, forbiddenResponse } from "@/lib/utils/apiResponse";
import { orgCapabilityErrorResponse } from "@/lib/utils/orgCapabilityErrors";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    if (req.user.role === "ORG_ADMIN") {
      if (!req.user.organizationId) return successResponse([]);
      const caps = await assertInventoryAccessForUser(req.user);
      if (caps?.inventorySurface !== "organization") {
        return successResponse([]);
      }
      const inventory = await getOrgInventory(req.user.organizationId);
      return successResponse(inventory);
    }

    // Cross-organization views (no org filter, or an arbitrary organizationId) are
    // platform-admin only — other manage:inventory roles (BRANCH_MANAGER, INVENTORY_MANAGER)
    // are branch-scoped and have no legitimate reason to see another org's warehouse stock.
    if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId") ?? undefined;
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
