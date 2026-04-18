import { withSuperAdmin } from "@/lib/middleware/withSuperAdmin";
import { getTenantDetail, updateTenantStatus } from "@/lib/services/superadmin.service";
import { updateTenant, deleteTenant } from "@/lib/services/tenant.service";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const getHandler = async (_req: AuthedRequest, ctx?: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    const detail = await getTenantDetail(id);
    if (!detail) return notFoundResponse("Tenant not found");
    return successResponse(detail);
  } catch {
    return serverErrorResponse();
  }
};

const patchHandler = async (req: AuthedRequest, ctx?: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    const body = await req.json();
    const { status, name, email, phone, address, domain, settings } = body;

    if (status) {
      if (!["active", "suspended", "trial"].includes(status)) {
        return errorResponse("Invalid status value");
      }
      const updated = await updateTenantStatus(id, status);
      if (!updated) return notFoundResponse("Tenant not found");
      return successResponse(updated, `Tenant ${status}`);
    }

    const updated = await updateTenant(id, {
      ...(name && { name }),
      ...(email && { email }),
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
      ...(domain !== undefined && { domain }),
      ...(settings && { settings }),
    });

    if (!updated) return notFoundResponse("Tenant not found");
    return successResponse(updated, "Tenant updated");
  } catch {
    return serverErrorResponse();
  }
};

const deleteHandler = async (_req: AuthedRequest, ctx?: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    const deleted = await deleteTenant(id);
    if (!deleted) return notFoundResponse("Tenant not found");
    return successResponse(null, "Tenant deleted");
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withSuperAdmin(getHandler);
export const PATCH = withSuperAdmin(patchHandler);
export const DELETE = withSuperAdmin(deleteHandler);
