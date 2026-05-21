import { describe, expect, it } from "vitest";
import { receivePurchaseOrderSchema } from "@/lib/validations/purchaseOrder.schema";

const validSignature =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("receivePurchaseOrderSchema", () => {
  it("requires signature fields", () => {
    const result = receivePurchaseOrderSchema.safeParse({
      items: [{ itemId: "item1", receivedQuantity: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts items with signature capture", () => {
    const result = receivePurchaseOrderSchema.safeParse({
      items: [{ itemId: "item1", receivedQuantity: 2 }],
      signedByName: "Jane Receiver",
      signatureDataUrl: validSignature,
    });
    expect(result.success).toBe(true);
  });
});
