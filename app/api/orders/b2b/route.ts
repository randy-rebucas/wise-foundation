import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { createB2BOrder } from "@/lib/services/order.service";
import { createB2BOrderSchema } from "@/lib/validations/order.schema";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { writeAuditLog } from "@/lib/services/audit.service";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const postHandler = async (req: AuthedRequest) => {
  try {
    const body = await req.json();
    const parsed = createB2BOrderSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const order = await createB2BOrder({
      ...parsed.data,
      items: parsed.data.items.map((i) => ({ ...i, variantId: i.variantId ?? undefined })),
      createdBy: req.user.id,
      actingUser: { role: req.user.role, organizationId: req.user.organizationId },
    });

    void writeAuditLog({
      action: "order.created",
      actor: { id: req.user.id, name: req.user.name },
      targetId: String((order as { _id: unknown })._id),
      targetType: "Order",
      metadata: {
        channel: "B2B",
        sellerOrganizationId: parsed.data.sellerOrganizationId,
        buyerOrganizationId: parsed.data.buyerOrganizationId,
      },
    });

    return successResponse(order, "B2B order created", 201);
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const POST = withStaffAuth(withPermission("manage:orders")(postHandler));
