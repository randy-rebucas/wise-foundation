import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { verifyTotpToken } from "@/lib/services/totp.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

/**
 * One-shot TOTP verification for mid-session step-up (e.g. before sensitive operations).
 * The full login-time enforcement happens in auth.service.ts via verifyTotpToken.
 */
const handler = async (req: AuthedRequest) => {
  try {
    const body = (await req.json()) as { token?: unknown };
    if (typeof body.token !== "string" || !body.token.trim()) {
      return errorResponse('Body must include "token"');
    }
    const valid = await verifyTotpToken(req.user.id, body.token.trim());
    if (!valid) return errorResponse("Invalid or expired code", 401);
    return successResponse(null, "Verified");
  } catch (err) {
    if (err instanceof Error) return errorResponse(err.message);
    return serverErrorResponse();
  }
};

export const POST = withStaffAuth(handler);
