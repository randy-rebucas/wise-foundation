import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getOrganizationById, updateOrganization, deleteOrganization } from "@/lib/services/organization.service";
import {
  successResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    if (req.user.role === "ORG_ADMIN" && req.user.organizationId !== id) {
      return notFoundResponse("Organization not found");
    }
    const org = await getOrganizationById(id);
    if (!org) return notFoundResponse("Organization not found");
    return successResponse(org);
  } catch {
    return serverErrorResponse();
  }
};

const putHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    const body = await req.json();
    const updated = await updateOrganization(id, body);
    if (!updated) return notFoundResponse("Organization not found");
    return successResponse(updated, "Organization updated");
  } catch {
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = (ctx as { params: { id: string } }).params;
    const deleted = await deleteOrganization(id);
    if (!deleted) return notFoundResponse("Organization not found");
    return successResponse(null, "Organization deleted");
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withAuth(getHandler);
export const PUT = withAuth(withPermission("manage:organizations")(putHandler));
export const DELETE = withAuth(withPermission("manage:organizations")(deleteHandler));
