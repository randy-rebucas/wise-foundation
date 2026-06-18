import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getOrganizations, createOrganization } from "@/lib/services/organization.service";
import { successResponse, errorResponse, serverErrorResponse, forbiddenResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import type { OrganizationType } from "@/lib/db/models/Organization";

const VALID_TYPES: OrganizationType[] = ["distributor", "franchise", "partner", "headquarters"];

const getHandler = async (req: AuthedRequest) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const { searchParams } = new URL(req.url);
    const rawType = searchParams.get("type");
    const type: OrganizationType | undefined =
      rawType && VALID_TYPES.includes(rawType as OrganizationType)
        ? (rawType as OrganizationType)
        : undefined;
    const organizations = await getOrganizations(type);
    return successResponse(organizations);
  } catch {
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const body = await req.json();
    if (!body.name?.trim()) return errorResponse("Organization name is required");
    if (!VALID_TYPES.includes(body.type)) {
      return errorResponse("Type must be distributor, franchise, partner, or headquarters");
    }
    const organization = await createOrganization(body);
    return successResponse(organization, "Organization created", 201);
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:organizations")(getHandler));
export const POST = withStaffAuth(withPermission("manage:organizations")(postHandler));
