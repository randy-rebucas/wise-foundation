import { forbiddenResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "./withAuth";

type Handler = (req: AuthedRequest, ctx?: unknown) => Promise<Response>;

export function withPermission(...requiredPermissions: string[]) {
  return (handler: Handler) => {
    return async (req: AuthedRequest, ctx?: unknown): Promise<Response> => {
      const userPermissions = req.user?.permissions ?? [];

      // SUPER_ADMIN bypasses all permission checks
      if (req.user?.role === "SUPER_ADMIN") return handler(req, ctx);

      const hasAll = requiredPermissions.every((p) => userPermissions.includes(p));
      if (!hasAll) return forbiddenResponse("Insufficient permissions");

      return handler(req, ctx);
    };
  };
}
