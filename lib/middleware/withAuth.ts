import { auth } from "@/auth";
import { unauthorizedResponse } from "@/lib/utils/apiResponse";
import type { NextRequest } from "next/server";
import { effectivePermissions } from "@/lib/permissions";
import type { SessionUser } from "@/types";

export type AuthedRequest = NextRequest & { user: SessionUser };

type Handler = (req: AuthedRequest, ctx?: unknown) => Promise<Response>;

export function withAuth(handler: Handler) {
  return async (req: NextRequest, ctx?: unknown): Promise<Response> => {
    const session = await auth();
    if (!session?.user) return unauthorizedResponse();

    const authedReq = req as AuthedRequest;
    const base = session.user as SessionUser;
    authedReq.user = {
      ...base,
      permissions: effectivePermissions(base),
    };

    return handler(authedReq, ctx);
  };
}
