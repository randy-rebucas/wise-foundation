import { withAuth } from "./withAuth";
import { forbiddenResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "./withAuth";

type Handler = (req: AuthedRequest, ctx?: unknown) => Promise<Response>;

export function withSuperAdmin(handler: Handler) {
  return withAuth(async (req: AuthedRequest, ctx?: unknown) => {
    if (req.user.role !== "SUPER_ADMIN") {
      return forbiddenResponse("Super admin access required");
    }
    return handler(req, ctx);
  });
}
