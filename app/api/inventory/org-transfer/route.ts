import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { processOrgTransfer } from "@/lib/services/inventory.service";
import { orgTransferSchema } from "@/lib/validations/inventory.schema";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const postHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    const parsed = orgTransferSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const result = await processOrgTransfer(req.user.id, parsed.data);
    return successResponse(result, "Stock transferred between organizations", 201);
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const POST = withAuth(withPermission("manage:inventory")(postHandler));
