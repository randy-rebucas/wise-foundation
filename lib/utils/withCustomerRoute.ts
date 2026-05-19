import { requireCustomerSession } from "@/lib/utils/requireCustomerSession";
import { errorResponse } from "@/lib/utils/apiResponse";

export { errorResponse, successResponse } from "@/lib/utils/apiResponse";

type CustomerHandler = (
  userId: string,
  req: Request
) => Promise<Response>;

/** Wraps account API handlers with customer session + consistent error handling. */
export function withCustomerRoute(handler: CustomerHandler) {
  return async (req: Request): Promise<Response> => {
    const { error, session } = await requireCustomerSession();
    if (error) return error;
    try {
      return await handler(session!.user.id, req);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      return errorResponse(msg, 500);
    }
  };
}
