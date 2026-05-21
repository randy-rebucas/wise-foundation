import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { loadOrganizationCapabilitiesForUser } from "@/lib/organization/capabilities";
import { connectDB } from "@/lib/db/connect";
import { Organization } from "@/lib/db/models/Organization";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    if (!req.user.organizationId) {
      return errorResponse("No organization on this account", 404);
    }

    await connectDB();
    const org = await Organization.findOne({
      _id: req.user.organizationId,
      deletedAt: null,
      isActive: true,
    })
      .select("name type settings commissionRate")
      .lean();

    if (!org) return errorResponse("Organization not found", 404);

    const capabilities = await loadOrganizationCapabilitiesForUser(req.user);
    if (!capabilities) return errorResponse("Organization not found", 404);

    return successResponse({
      _id: org._id.toString(),
      name: org.name,
      type: org.type,
      settings: org.settings,
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
