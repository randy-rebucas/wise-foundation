import { hasPermission, isPlatformAdmin } from "@/lib/permissions";
import { forbiddenResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "./withAuth";

type Handler = (req: AuthedRequest, ctx?: unknown) => Promise<Response>;

/** User needs at least one of the listed permissions (platform admin always passes). */
export function withAnyPermission(...anyOf: string[]): (handler: Handler) => Handler {
  return (handler: Handler) => {
    return async (req: AuthedRequest, ctx?: unknown): Promise<Response> => {
      const user = req.user;
      if (!user) return forbiddenResponse("Unauthorized");
      if (isPlatformAdmin(user.role)) return handler(req, ctx);
      if (!anyOf.some((p) => hasPermission(user, p))) {
        return forbiddenResponse("Insufficient permissions");
      }
      return handler(req, ctx);
    };
  };
}
