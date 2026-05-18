import { auth } from "@/auth";
import { errorResponse } from "@/lib/utils/apiResponse";

export async function requireCustomerSession() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    return { error: errorResponse("Unauthorized", 401) as Response, session: null };
  }
  return { error: null, session };
}
