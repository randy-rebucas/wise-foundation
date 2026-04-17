import { withAuth } from "@/lib/middleware/withAuth";
import { withTenant } from "@/lib/middleware/withTenant";
import { withPermission } from "@/lib/middleware/withPermission";
import { getUsers, createUser } from "@/lib/services/user.service";
import { createUserSchema } from "@/lib/validations/user.schema";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? undefined;
    const role = searchParams.get("role") ?? undefined;
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");

    const result = await getUsers(req.user.tenantId, search, role, page, limit);
    return successResponse(result.users, undefined, 200, {
      page,
      limit,
      total: result.total,
    });
  } catch {
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const user = await createUser(req.user.tenantId, parsed.data);
    return successResponse(user, "User created successfully", 201);
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withAuth(withTenant(withPermission("manage:users")(getHandler)));
export const POST = withAuth(withTenant(withPermission("manage:users")(postHandler)));
