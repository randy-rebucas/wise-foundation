import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getInventoryById, updateLowStockThreshold } from "@/lib/services/inventory.service";
import { updateThresholdSchema } from "@/lib/validations/inventory.schema";
import { assertBranchAccess, isBranchAccessDeniedError } from "@/lib/utils/branchAccess";
import { successResponse, errorResponse, notFoundResponse, forbiddenResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { writeAuditLog } from "@/lib/services/audit.service";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const patchHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const body = await req.json();
    const parsed = updateThresholdSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(", "));
    }

    const existing = await getInventoryById(id);
    if (!existing) return notFoundResponse("Inventory record not found");

    await assertBranchAccess(req.user, String(existing.branchId));

    const updated = await updateLowStockThreshold(id, parsed.data.lowStockThreshold);

    void writeAuditLog({
      action: "inventory.threshold_updated",
      actor: { id: req.user.id, name: req.user.name },
      targetId: id,
      targetType: "Inventory",
      metadata: { lowStockThreshold: parsed.data.lowStockThreshold },
    });

    return successResponse(updated, "Low stock threshold updated");
  } catch (error) {
    if (isBranchAccessDeniedError(error)) return forbiddenResponse(error.message);
    if (error instanceof Error) return errorResponse(error.message);
    return serverErrorResponse();
  }
};

export const PATCH = withStaffAuth(withPermission("manage:inventory")(patchHandler));
