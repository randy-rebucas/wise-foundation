import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { updateSupplier, deleteSupplier } from "@/lib/services/supplier.service";
import { successResponse, notFoundResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const putHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const body = await req.json();
    const updated = await updateSupplier(id, body, { id: req.user.id, name: req.user.name });
    if (!updated) return notFoundResponse("Supplier not found");
    return successResponse(updated, "Supplier updated");
  } catch {
    return serverErrorResponse();
  }
};

const deleteHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const deleted = await deleteSupplier(id, { id: req.user.id, name: req.user.name });
    if (!deleted) return notFoundResponse("Supplier not found");
    return successResponse(null, "Supplier deleted");
  } catch {
    return serverErrorResponse();
  }
};

export const PUT = withStaffAuth(withPermission("manage:inventory")(putHandler));
export const DELETE = withStaffAuth(withPermission("manage:inventory")(deleteHandler));
