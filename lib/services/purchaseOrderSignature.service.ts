import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { PurchaseOrder } from "@/lib/db/models/PurchaseOrder";
import { assertValidSignatureDataUrl } from "@/lib/utils/signatureDataUrl";
import type { SignPurchaseOrderInput } from "@/lib/validations/purchaseOrder.schema";
import { getPurchaseOrderById } from "@/lib/services/purchaseOrder.service";
import { canUserAccessPurchaseOrder } from "@/lib/purchaseOrders/access";
import { recordPurchaseOrderAudit } from "@/lib/services/purchaseOrderAudit.service";
import {
  canApprovePurchaseOrders,
  isOrgPurchaseOrderSubmitter,
} from "@/lib/permissions/purchaseOrders";
import type { SessionUser } from "@/types";

export async function signPurchaseOrder(
  poId: string,
  user: SessionUser,
  input: SignPurchaseOrderInput
) {
  await connectDB();
  assertValidSignatureDataUrl(input.signatureDataUrl);

  const po = await PurchaseOrder.findOne({ _id: poId, deletedAt: null });
  if (!po) throw new Error("Purchase order not found");
  if (!canUserAccessPurchaseOrder(po, user)) {
    throw new Error("Purchase order not found");
  }

  const signature = {
    name: input.signedByName.trim(),
    userId: new mongoose.Types.ObjectId(user.id),
    imageDataUrl: input.signatureDataUrl.trim(),
    signedAt: new Date(),
  };

  if (input.role === "submit") {
    if (!isOrgPurchaseOrderSubmitter(user) && !canApprovePurchaseOrders(user)) {
      throw new Error("You cannot submit purchase orders");
    }
    if (po.status !== "draft") {
      throw new Error("Only draft purchase orders can be submitted");
    }
    await PurchaseOrder.findByIdAndUpdate(poId, {
      $set: {
        status: "submitted",
        submittedSignature: signature,
      },
    });
    await recordPurchaseOrderAudit({
      purchaseOrderId: poId,
      action: "submitted",
      user,
      fromStatus: "draft",
      toStatus: "submitted",
      performedByName: input.signedByName,
    });
  } else {
    if (!canApprovePurchaseOrders(user)) {
      throw new Error("Only platform administrators can approve purchase orders");
    }
    if (po.status !== "submitted") {
      throw new Error("Only submitted purchase orders can be approved");
    }
    await PurchaseOrder.findByIdAndUpdate(poId, {
      $set: {
        status: "approved",
        approvedBy: new mongoose.Types.ObjectId(user.id),
        approvedAt: new Date(),
        approvedSignature: signature,
      },
    });
    await recordPurchaseOrderAudit({
      purchaseOrderId: poId,
      action: "approved",
      user,
      fromStatus: "submitted",
      toStatus: "approved",
      performedByName: input.signedByName,
    });
  }

  return getPurchaseOrderById(poId);
}
