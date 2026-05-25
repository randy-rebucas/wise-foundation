import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { disableTotp, verifyTotpToken } from "@/lib/services/totp.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const handler = async (req: AuthedRequest) => {
  try {
    const body = (await req.json()) as { token?: unknown };
    if (typeof body.token !== "string" || !body.token.trim()) {
      return errorResponse('Body must include "token" to confirm disable');
    }

    // Require a valid TOTP token before disabling (prevents someone with a stolen session from turning off 2FA)
    const valid = await verifyTotpToken(req.user.id, body.token.trim());
    if (!valid) return errorResponse("Invalid or expired code", 401);

    await disableTotp(req.user.id);
    return successResponse(null, "2FA disabled");
  } catch (err) {
    if (err instanceof Error) return errorResponse(err.message);
    return serverErrorResponse();
  }
};

export const DELETE = withStaffAuth(handler);
