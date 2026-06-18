import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getOrganizationById, updateOrganization, deleteOrganization } from "@/lib/services/organization.service";
import {
  successResponse,
  notFoundResponse,
  serverErrorResponse,
  forbiddenResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
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
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    if (req.user.role === "ORG_ADMIN" && req.user.organizationId !== id) {
      return notFoundResponse("Organization not found");
    }
    const body = await req.json();
    const updated = await updateOrganization(id, body);
    if (!updated) return notFoundResponse("Organization not found");
    return successResponse(updated, "Organization updated");
  } catch {
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest, ctx: unknown) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const deleted = await deleteOrganization(id);
    if (!deleted) return notFoundResponse("Organization not found");
    return successResponse(null, "Organization deleted");
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:organizations")(getHandler));
export const PUT = withStaffAuth(withPermission("manage:organizations")(putHandler));
export const DELETE = withStaffAuth(withPermission("manage:organizations")(deleteHandler));
