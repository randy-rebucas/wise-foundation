import { forbiddenResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "./withAuth";

type Handler = (req: AuthedRequest, ctx?: unknown) => Promise<Response>;

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/**
 * Ensures the request has a valid tenant scope.
 *
 * - Regular users: tenant is always the one baked into their JWT.
 * - SUPER_ADMIN: may supply an `x-tenant-id` header to scope themselves to a
 *   specific tenant (used when browsing another tenant's slug-dashboard).
 *   The header value must be a valid 24-char hex ObjectId.
 */
export function withTenant(handler: Handler) {
  return async (req: AuthedRequest, ctx?: unknown): Promise<Response> => {
    let effectiveTenantId = req.user?.tenantId;

    if (req.user?.role === "SUPER_ADMIN") {
      const headerTenantId = req.headers.get("x-tenant-id");
      if (headerTenantId) {
        if (!OBJECT_ID_RE.test(headerTenantId)) {
          return forbiddenResponse("Invalid x-tenant-id format");
        }
        effectiveTenantId = headerTenantId;
      }
    }

    if (!effectiveTenantId) {
      return forbiddenResponse("Tenant context missing");
    }

    // Stamp the effective tenant onto the request so every downstream service
    // call uses the right tenantId — even when SUPER_ADMIN is acting on behalf
    // of another tenant.
    req.user = { ...req.user, tenantId: effectiveTenantId };

    return handler(req, ctx);
  };
}
