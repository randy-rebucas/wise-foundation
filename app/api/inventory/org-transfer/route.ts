import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { processOrgTransfer } from "@/lib/services/inventory.service";
import { orgTransferSchema } from "@/lib/validations/inventory.schema";
import { successResponse, errorResponse, serverErrorResponse, forbiddenResponse } from "@/lib/utils/apiResponse";
import { writeAuditLog } from "@/lib/services/audit.service";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const postHandler = async (req: AuthedRequest) => {
  // Moving stock between two organizations is a platform-admin action (matches the
  // Org Transfer button, which is only rendered for isAdmin in the inventory page) —
  // branch-scoped manage:inventory roles have no legitimate org-to-org transfer use case.
  if (req.user.role !== "ADMIN") return forbiddenResponse("Admin only");
  try {
    const body = await req.json();
    const parsed = orgTransferSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const result = await processOrgTransfer(req.user.id, parsed.data);

    void writeAuditLog({
      action: "inventory.org_transferred",
      actor: { id: req.user.id, name: req.user.name },
      targetId: parsed.data.productId,
      targetType: "Product",
      metadata: {
        fromOrganizationId: parsed.data.fromOrganizationId,
        toOrganizationId: parsed.data.toOrganizationId,
        quantity: parsed.data.quantity,
      },
    });

    return successResponse(result, "Stock transferred between organizations", 201);
  } catch (error) {
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const POST = withStaffAuth(withPermission("manage:inventory")(postHandler));
