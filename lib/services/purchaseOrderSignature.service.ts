import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { PurchaseOrder } from "@/lib/db/models/PurchaseOrder";
import { assertValidSignatureDataUrl } from "@/lib/utils/signatureDataUrl";
import type { SignPurchaseOrderInput } from "@/lib/validations/purchaseOrder.schema";
import { getPurchaseOrderById } from "@/lib/services/purchaseOrder.service";

export async function signPurchaseOrder(
  poId: string,
  userId: string,
  input: SignPurchaseOrderInput
) {
  await connectDB();
  assertValidSignatureDataUrl(input.signatureDataUrl);

  const po = await PurchaseOrder.findOne({ _id: poId, deletedAt: null });
  if (!po) throw new Error("Purchase order not found");

  const signature = {
    name: input.signedByName.trim(),
    userId: new mongoose.Types.ObjectId(userId),
    imageDataUrl: input.signatureDataUrl.trim(),
    signedAt: new Date(),
  };

  if (input.role === "submit") {
    if (po.status !== "draft") {
      throw new Error("Only draft purchase orders can be submitted");
    }
    await PurchaseOrder.findByIdAndUpdate(poId, {
      $set: {
        status: "submitted",
        submittedSignature: signature,
      },
    });
  } else {
    if (po.status !== "submitted") {
      throw new Error("Only submitted purchase orders can be approved");
    }
    await PurchaseOrder.findByIdAndUpdate(poId, {
      $set: {
        status: "approved",
        approvedBy: new mongoose.Types.ObjectId(userId),
        approvedAt: new Date(),
        approvedSignature: signature,
      },
    });
  }

  return getPurchaseOrderById(poId);
}
