import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getOrganizations, createOrganization } from "@/lib/services/organization.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import type { OrganizationType } from "@/lib/db/models/Organization";

const VALID_TYPES: OrganizationType[] = ["distributor", "franchise", "partner"];

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as OrganizationType | null;
    const organizations = await getOrganizations(type ?? undefined);
    return successResponse(organizations);
  } catch {
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    if (!body.name?.trim()) return errorResponse("Organization name is required");
    if (!VALID_TYPES.includes(body.type)) {
      return errorResponse("Type must be distributor, franchise, or partner");
    }
    const organization = await createOrganization(body);
    return successResponse(organization, "Organization created", 201);
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withAuth(withPermission("manage:organizations")(getHandler));
export const POST = withAuth(withPermission("manage:organizations")(postHandler));
