import { NextResponse } from "next/server";
import { withStaffAuth } from "@/lib/middleware/withStaffAuth";
import { withPermission } from "@/lib/middleware/withPermission";
import { exportProductsToCsv } from "@/lib/services/product.service";
import { serverErrorResponse } from "@/lib/utils/apiResponse";
import type { AuthedRequest } from "@/lib/middleware/withAuth";

const getHandler = async (req: AuthedRequest) => {
  void req;
  try {
    const csv = await exportProductsToCsv();
    const date = new Date().toISOString().slice(0, 10);
    const filename = `products-export-${date}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return serverErrorResponse();
  }
};

export const GET = withStaffAuth(withPermission("manage:products")(getHandler));
