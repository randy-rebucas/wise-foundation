import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { initTotpSetup, isTotpRequiredRole } from "@/lib/services/totp.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const handler = async (req: AuthedRequest) => {
  try {
    if (!isTotpRequiredRole(req.user.role)) {
      return errorResponse("2FA is only available for admin accounts");
    }
    const { secret, qrDataUrl } = await initTotpSetup(req.user.id);
    return successResponse({ secret, qrDataUrl }, "Scan the QR code with your authenticator app, then confirm with /api/auth/2fa/confirm");
  } catch (err) {
    if (err instanceof Error) return errorResponse(err.message);
    return serverErrorResponse();
  }
};

export const POST = withStaffAuth(handler);
