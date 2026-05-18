/** Captured signature stored on a purchase order (PNG data URL). */
export type PurchaseOrderSignatureRecord = {
  name: string;
  userId: string;
  imageDataUrl: string;
  signedAt: Date | string;
};

export type PurchaseOrderSignRole = "submit" | "approve";
