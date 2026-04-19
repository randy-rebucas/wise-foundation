import { withAuth } from "@/lib/middleware/withAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { processResellerSale } from "@/lib/services/organizationInventory.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const VALID_PAYMENT = ["cash", "gcash", "card", "bank_transfer", "credit"];

const postHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();

    if (!body.organizationId) return errorResponse("Organization is required");
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return errorResponse("At least one item is required");
    }
    if (!VALID_PAYMENT.includes(body.paymentMethod)) {
      return errorResponse("Invalid payment method");
    }
    if (typeof body.amountPaid !== "number" || body.amountPaid < 0) {
      return errorResponse("Amount paid is required");
    }

    const result = await processResellerSale({
      organizationId: body.organizationId,
      cashierId: req.user.id,
      items: body.items,
      paymentMethod: body.paymentMethod,
      amountPaid: body.amountPaid,
      notes: body.notes,
    });

    return successResponse(result, "Reseller sale recorded", 201);
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const POST = withAuth(withPermission("manage:organizations", { allowRoles: ["ORG_ADMIN"] })(postHandler));
