import { assertValidSignatureDataUrl } from "@/lib/utils/signatureDataUrl";
import type { SessionUser } from "@/types";

export interface PurchaseOrderSignatureEmbed {
  name: string;
  userId: string;
  imageDataUrl: string;
  signedAt: Date;
}

export function buildPurchaseOrderSignatureEmbed(
  user: SessionUser,
  signedByName: string,
  signatureDataUrl: string
): PurchaseOrderSignatureEmbed {
  assertValidSignatureDataUrl(signatureDataUrl);
  return {
    name: signedByName.trim(),
    userId: user.id,
    imageDataUrl: signatureDataUrl.trim(),
    signedAt: new Date(),
  };
}
