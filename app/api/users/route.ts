import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getUsers, createUser, bulkDeleteUsers } from "@/lib/services/user.service";
import { createUserSchema } from "@/lib/validations/user.schema";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { parsePagination } from "@/lib/utils/pagination";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const ORG_ADMIN_ALLOWED_ROLES = ["BRANCH_MANAGER", "STAFF", "INVENTORY_MANAGER"];

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? undefined;
    const role = searchParams.get("role") ?? undefined;
    const { page, limit } = parsePagination(searchParams);

    const organizationId =
      req.user.role === "ORG_ADMIN" ? (req.user.organizationId ?? undefined) : undefined;

    const result = await getUsers(search, role, page, limit, organizationId);
    return successResponse(result.users, undefined, 200, {
      page,
      limit,
      total: result.total,
    });
  } catch (err) {
    console.error("[GET /api/users]", err);
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();

    if (req.user.role === "ORG_ADMIN") {
      if (!ORG_ADMIN_ALLOWED_ROLES.includes(body.role)) {
        return errorResponse("You can only create Branch Manager, Staff, or Inventory Manager accounts");
      }
      body.organizationId = req.user.organizationId;
    }

    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const user = await createUser(parsed.data, { id: req.user.id, name: req.user.name });
    return successResponse(user, "User created successfully", 201);
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
    if (ids.length === 0) {
      return errorResponse("No user IDs provided");
    }

    const organizationId =
      req.user.role === "ORG_ADMIN" ? (req.user.organizationId ?? undefined) : undefined;

    const { deletedIds, failures } = await bulkDeleteUsers(
      ids,
      req.user.id,
      { id: req.user.id, name: req.user.name },
      organizationId
    );

    return successResponse(
      { deletedIds, failures },
      `${deletedIds.length} user${deletedIds.length === 1 ? "" : "s"} removed${failures.length ? `, ${failures.length} failed` : ""}`
    );
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:users")(getHandler));
export const POST = withStaffAuth(withPermission("manage:users")(postHandler));
export const DELETE = withStaffAuth(withPermission("manage:users")(deleteHandler));
