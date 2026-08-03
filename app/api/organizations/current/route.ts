import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { loadOrganizationCapabilitiesForUser } from "@/lib/organization/capabilities";
import { getOrganizationForCapabilities } from "@/lib/services/organization.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    if (!req.user.organizationId) {
      return errorResponse("No organization on this account", 404);
    }

    const org = await getOrganizationForCapabilities(req.user.organizationId);
    if (!org) return errorResponse("Organization not found", 404);

    const capabilities = await loadOrganizationCapabilitiesForUser(req.user);
    if (!capabilities) return errorResponse("Organization not found", 404);

    return successResponse({
      _id: org.id,
      name: org.name,
      type: org.type,
      settings: {
        canSellRetail: org.canSellRetail,
        canDistribute: org.canDistribute,
        hasInventory: org.hasInventory,
        commissionEnabled: org.commissionEnabled,
        canSubmitOrders: org.canSubmitOrders,
      },
      commissionRate: org.commissionRate,
      capabilities: {
        inventorySurface: capabilities.inventorySurface,
        posSurface: capabilities.posSurface,
      },
    });
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(getHandler);
