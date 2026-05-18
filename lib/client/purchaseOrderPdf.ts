/** Download purchase order PDF (requires authenticated session cookies). */
export async function downloadPurchaseOrderPdf(poId: string, poNumber: string): Promise<void> {
  const res = await fetch(`/api/purchase-orders/${poId}/pdf`, {
    credentials: "include",
  });
  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok) {
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as { error?: string };
      throw new Error(json.error ?? `Could not download PDF (${res.status})`);
    }
    throw new Error(`Could not download PDF (${res.status})`);
  }
  if (!contentType.includes("application/pdf")) {
    throw new Error("Server did not return a PDF file.");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${poNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
