import { hasPermission, isPlatformAdmin } from "@/lib/permissions";
import { forbiddenResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "./withAuth";

type Handler = (req: AuthedRequest, ctx?: unknown) => Promise<Response>;

interface PermissionOptions {
  allowRoles?: string[];
}

export function withPermission(requiredPermission: string, opts?: PermissionOptions): (handler: Handler) => Handler;
export function withPermission(...requiredPermissions: string[]): (handler: Handler) => Handler;
export function withPermission(
  firstArg: string,
  ...rest: (string | PermissionOptions | undefined)[]
): (handler: Handler) => Handler {
  const lastArg = rest[rest.length - 1];
  const hasOpts = lastArg !== null && typeof lastArg === "object" && !Array.isArray(lastArg);
  const opts = hasOpts ? (lastArg as PermissionOptions) : undefined;
  const requiredPermissions = hasOpts
    ? [firstArg, ...(rest.slice(0, -1) as string[])]
    : [firstArg, ...(rest as string[])];

  return (handler: Handler) => {
    return async (req: AuthedRequest, ctx?: unknown): Promise<Response> => {
      const user = req.user;
      if (!user) return forbiddenResponse("Unauthorized");

      if (isPlatformAdmin(user.role)) return handler(req, ctx);

      if (opts?.allowRoles?.includes(user.role)) return handler(req, ctx);

      if (!hasPermission(user, ...requiredPermissions)) {
        return forbiddenResponse("Insufficient permissions");
      }

      return handler(req, ctx);
    };
  };
}
