import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getOrganizationById, updateOrganization, deleteOrganization } from "@/lib/services/organization.service";
import {
  successResponse,
  errorResponse,
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

// Fields an ORG_ADMIN may edit on their own organization — profile/contact info only.
// type, settings (capability flags), commissionRate, parentOrganizationId, and isActive
// are platform-admin-controlled: letting an org self-grant capabilities or reparent
// itself would be a privilege escalation, not a profile edit.
const ORG_ADMIN_EDITABLE_FIELDS = ["name", "contactPerson", "email", "phone", "address", "notes"] as const;

const putHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    if (req.user.role === "ORG_ADMIN" && req.user.organizationId !== id) {
      return notFoundResponse("Organization not found");
    }
    const body = await req.json();
    const data =
      req.user.role === "ADMIN"
        ? body
        : Object.fromEntries(
            Object.entries(body).filter(([key]) =>
              (ORG_ADMIN_EDITABLE_FIELDS as readonly string[]).includes(key)
            )
          );
    const updated = await updateOrganization(id, data, { id: req.user.id, name: req.user.name });
    if (!updated) return notFoundResponse("Organization not found");
    return successResponse(updated, "Organization updated");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest, ctx: unknown) => {
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const deleted = await deleteOrganization(id, { id: req.user.id, name: req.user.name });
    if (!deleted) return notFoundResponse("Organization not found");
    return successResponse(null, "Organization deleted");
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:organizations")(getHandler));
export const PUT = withStaffAuth(withPermission("manage:organizations")(putHandler));
export const DELETE = withStaffAuth(withPermission("manage:organizations")(deleteHandler));
