import { forbiddenResponse } from "@/lib/utils/apiResponse";
import { isStaffBlockedRole } from "@/lib/utils/apiAccess";
import { withAuth, type AuthedRequest } from "@/lib/middleware/withAuth";
import type { NextRequest } from "next/server";

type Handler = (req: AuthedRequest, ctx?: unknown) => Promise<Response>;

/** Requires an authenticated staff user (blocks CUSTOMER and MEMBER). */
export function withStaffAuth(handler: Handler) {
  return withAuth(async (req, ctx) => {
    if (isStaffBlockedRole(req.user.role)) {
      return forbiddenResponse("Staff access required");
    }
    return handler(req, ctx);
  });
}
