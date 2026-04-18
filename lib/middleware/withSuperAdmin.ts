import { withAuth } from "./withAuth";
import { forbiddenResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "./withAuth";

type Handler = (req: AuthedRequest, ctx?: unknown) => Promise<Response>;

export function withAdmin(handler: Handler) {
  return withAuth(async (req: AuthedRequest, ctx?: unknown) => {
    if (req.user.role !== "ADMIN") {
      return forbiddenResponse("Admin access required");
    }
    return handler(req, ctx);
  });
}
