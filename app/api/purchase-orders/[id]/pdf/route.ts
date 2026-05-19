import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { getPurchaseOrderByIdForUser } from "@/lib/services/purchaseOrder.service";
import { errorResponse, notFoundResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

export const runtime = "nodejs";
export const maxDuration = 60;

const getHandler = async (req: AuthedRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
    const po = await getPurchaseOrderByIdForUser(id, req.user);
    if (!po) return notFoundResponse("Purchase order not found");

    const { buildPurchaseOrderPdf } = await import("@/lib/services/purchaseOrderPdf.service");
    const pdf = await buildPurchaseOrderPdf(id);
    const poNumber =
      typeof po === "object" && po !== null && "poNumber" in po
        ? String((po as { poNumber: string }).poNumber)
        : id;

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${poNumber}.pdf"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    console.error("[GET /api/purchase-orders/[id]/pdf]", error);
    if (error instanceof Error) {
      return errorResponse(error.message, 500);
    }
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:inventory")(getHandler));
