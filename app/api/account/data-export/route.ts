import { exportCustomerData } from "@/lib/services/customerAccountData.service";
import { errorResponse } from "@/lib/utils/withCustomerRoute";
import { withCustomerRoute } from "@/lib/utils/withCustomerRoute";

export const GET = withCustomerRoute(async (userId) => {
  const exportData = await exportCustomerData(userId);
  if (!exportData) return errorResponse("Account not found", 404);

  const json = JSON.stringify(exportData, null, 2);
  return new Response(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="glowish-data-export-${Date.now()}.json"`,
    },
  });
});
