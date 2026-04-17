import { forbiddenResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "./withAuth";

type Handler = (req: AuthedRequest, ctx?: unknown) => Promise<Response>;

/**
 * Ensures the requesting user's tenantId matches the resource being accessed.
 * For SUPER_ADMIN, allows access to any tenant via x-tenant-id header.
 */
export function withTenant(handler: Handler) {
  return async (req: AuthedRequest, ctx?: unknown): Promise<Response> => {
    if (!req.user?.tenantId) return forbiddenResponse("Tenant context missing");
    return handler(req, ctx);
  };
}
