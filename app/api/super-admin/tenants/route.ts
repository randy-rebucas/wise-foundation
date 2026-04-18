import { type NextRequest } from "next/server";
import { withSuperAdmin } from "@/lib/middleware/withSuperAdmin";
import { getAllTenants } from "@/lib/services/superadmin.service";
import { registerTenantWithOwner } from "@/lib/services/auth.service";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const search = searchParams.get("search") ?? undefined;
    const status = searchParams.get("status") ?? undefined;

    const result = await getAllTenants(page, limit, search, status);
    return successResponse(result.tenants, undefined, 200, {
      page,
      limit,
      total: result.total,
      totalPages: result.pages,
    });
  } catch {
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    const { tenantName, tenantSlug, email, name, password } = body;

    if (!tenantName || !tenantSlug || !email || !name || !password) {
      return errorResponse("Missing required fields: tenantName, tenantSlug, email, name, password");
    }

    const result = await registerTenantWithOwner({
      tenantName,
      tenantSlug,
      email,
      name,
      password,
    });

    return successResponse(result, "Tenant created successfully", 201);
  } catch (err) {
    if (err instanceof Error) return errorResponse(err.message);
    return serverErrorResponse();
  }
};

export const GET = withSuperAdmin(getHandler);
export const POST = withSuperAdmin(postHandler);
