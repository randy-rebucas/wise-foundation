import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { getMe, updateMe } from "@/lib/services/user.service";
import { serializeMeUser } from "@/lib/utils/serializeMeUser";
import { z } from "zod";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";
import logger from "@/lib/logger";

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
});

const getHandler = async (req: AuthedRequest) => {
  try {
    const user = await getMe(req.user.id);
    if (!user) return errorResponse("User not found", 404);
    return successResponse(serializeMeUser(user));
  } catch (err) {
    logger.error({ err }, "GET /api/users/me error");
    return serverErrorResponse();
  }
};

const patchHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const user = await updateMe(req.user.id, parsed.data);
    if (!user) return errorResponse("User not found", 404);
    return successResponse(serializeMeUser(user), "Profile updated");
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(getHandler);
export const PATCH = withStaffAuth(patchHandler);
