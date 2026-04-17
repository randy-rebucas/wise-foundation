import { withAuth } from "@/lib/middleware/withAuth";
import { withTenant } from "@/lib/middleware/withTenant";
import { withPermission } from "@/lib/middleware/withPermission";
import { processCheckout } from "@/lib/services/pos.service";
import { getOrders } from "@/lib/services/order.service";
import { checkoutSchema } from "@/lib/validations/order.schema";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId") ?? req.user.branchIds[0];
    const status = searchParams.get("status") ?? undefined;
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");

    const result = await getOrders(req.user.tenantId, branchId, { status }, page, limit);
    return successResponse(result.orders, undefined, 200, {
      page,
      limit,
      total: result.total,
    });
  } catch {
    return serverErrorResponse();
  }
};

const postHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const result = await processCheckout({
      tenantId: req.user.tenantId,
      branchId: parsed.data.branchId,
      cashierId: req.user.id,
      items: parsed.data.items.map((i) => ({ ...i, variantId: i.variantId ?? undefined })),
      memberId: parsed.data.memberId,
      discountPercent: parsed.data.discountPercent,
      paymentMethod: parsed.data.paymentMethod,
      amountPaid: parsed.data.amountPaid,
      notes: parsed.data.notes,
    });

    return successResponse(result, "Order completed", 201);
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const GET = withAuth(withTenant(getHandler));
export const POST = withAuth(withTenant(withPermission("use:pos")(postHandler)));
