import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getUserById, setUserLock, userOrganizationIdString } from "@/lib/services/user.service";
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

const postHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as Ctx).params;

    const body = (await req.json()) as { locked?: unknown };
    if (typeof body.locked !== "boolean") {
      return errorResponse('Body must include "locked" (boolean)');
    }

    const target = await getUserById(id);
    if (!target) return notFoundResponse("User not found");

    if (req.user.role === "ORG_ADMIN") {
      const oid = req.user.organizationId;
      if (!oid || userOrganizationIdString(target) !== oid) {
        return notFoundResponse("User not found");
      }
    }

    if (id === req.user.id) {
      return errorResponse("You cannot lock your own account");
    }

    await setUserLock(id, body.locked, { id: req.user.id, name: req.user.name });

    return successResponse(
      null,
      body.locked ? "User account locked" : "User account unlocked"
    );
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const POST = withStaffAuth(withPermission("manage:users")(postHandler));
