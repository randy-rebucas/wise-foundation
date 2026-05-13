import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getUserById, updateUser, deleteUser, userOrganizationIdString } from "@/lib/services/user.service";
import { updateUserSchema } from "@/lib/validations/user.schema";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const ORG_ADMIN_ALLOWED_ROLES = ["BRANCH_MANAGER", "STAFF", "INVENTORY_MANAGER"];

interface Ctx {
  params: Promise<{ id: string }>;
}

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as Ctx).params;
    const user = await getUserById(id);
    if (!user) return notFoundResponse("User not found");

    if (req.user.role === "ORG_ADMIN") {
      const oid = req.user.organizationId;
      if (!oid || userOrganizationIdString(user) !== oid) {
        return notFoundResponse("User not found");
      }
    }

    return successResponse(user);
  } catch {
    return serverErrorResponse();
  }
};

const patchHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as Ctx).params;
    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const target = await getUserById(id);
    if (!target) return notFoundResponse("User not found");

    if (req.user.role === "ORG_ADMIN") {
      const oid = req.user.organizationId;
      if (!oid || userOrganizationIdString(target) !== oid) {
        return notFoundResponse("User not found");
      }
      if (parsed.data.role && !ORG_ADMIN_ALLOWED_ROLES.includes(parsed.data.role)) {
        return errorResponse("You can only assign Branch Manager, Staff, or Inventory Manager roles");
      }
    }

    const payload = { ...parsed.data };
    if (req.user.role === "ORG_ADMIN" && req.user.organizationId) {
      payload.organizationId = req.user.organizationId;
    }

    const user = await updateUser(id, payload);
    return successResponse(user, "User updated successfully");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as Ctx).params;

    const target = await getUserById(id);
    if (!target) return notFoundResponse("User not found");

    if (req.user.role === "ORG_ADMIN") {
      const oid = req.user.organizationId;
      if (!oid || userOrganizationIdString(target) !== oid) {
        return notFoundResponse("User not found");
      }
    }

    await deleteUser(id, req.user.id);
    return successResponse(null, "User removed successfully");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withAuth(withPermission("manage:users")(getHandler));
export const PATCH = withAuth(withPermission("manage:users")(patchHandler));
export const DELETE = withAuth(withPermission("manage:users")(deleteHandler));
