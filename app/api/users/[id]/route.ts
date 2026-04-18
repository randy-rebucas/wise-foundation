import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getUserById, updateUser, deleteUser } from "@/lib/services/user.service";
import { updateUserSchema } from "@/lib/validations/user.schema";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

interface Ctx {
  params: Promise<{ id: string }>;
}

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as Ctx).params;
    const user = await getUserById(id);
    if (!user) return notFoundResponse("User not found");
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

    const user = await updateUser(id, parsed.data);
    return successResponse(user, "User updated successfully");
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as Ctx).params;
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
