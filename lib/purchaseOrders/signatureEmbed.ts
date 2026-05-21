import mongoose from "mongoose";
import { assertValidSignatureDataUrl } from "@/lib/utils/signatureDataUrl";
import type { IPurchaseOrderSignatureEmbed } from "@/lib/db/models/PurchaseOrder";
import type { SessionUser } from "@/types";

export function buildPurchaseOrderSignatureEmbed(
  user: SessionUser,
  signedByName: string,
  signatureDataUrl: string
): IPurchaseOrderSignatureEmbed {
  assertValidSignatureDataUrl(signatureDataUrl);
  return {
    name: signedByName.trim(),
    userId: new mongoose.Types.ObjectId(user.id),
    imageDataUrl: signatureDataUrl.trim(),
    signedAt: new Date(),
  };
}
