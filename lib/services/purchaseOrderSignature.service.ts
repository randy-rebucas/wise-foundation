import { prisma } from "@/lib/db/prisma";
import type { SignPurchaseOrderInput } from "@/lib/validations/purchaseOrder.schema";
import { buildPurchaseOrderSignatureEmbed } from "@/lib/purchaseOrders/signatureEmbed";
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
  const po = await prisma.purchaseOrder.findFirst({ where: { id: poId, deletedAt: null } });
  if (!po) throw new Error("Purchase order not found");
  if (!canUserAccessPurchaseOrder(po, user)) {
    throw new Error("Purchase order not found");
  }

  const signature = buildPurchaseOrderSignatureEmbed(user, input.signedByName, input.signatureDataUrl);

  if (input.role === "submit") {
    if (!isOrgPurchaseOrderSubmitter(user) && !canApprovePurchaseOrders(user)) {
      throw new Error("You cannot submit purchase orders");
    }
    if (po.status !== "draft") {
      throw new Error("Only draft purchase orders can be submitted");
    }
    await prisma.$transaction([
      prisma.purchaseOrder.update({ where: { id: poId }, data: { status: "submitted" } }),
      prisma.purchaseOrderSignature.upsert({
        where: { purchaseOrderId_kind: { purchaseOrderId: poId, kind: "SUBMITTED" } },
        create: { purchaseOrderId: poId, kind: "SUBMITTED", ...signature },
        update: signature,
      }),
    ]);
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
    await prisma.$transaction([
      prisma.purchaseOrder.update({
        where: { id: poId },
        data: { status: "approved", approvedBy: user.id, approvedAt: new Date() },
      }),
      prisma.purchaseOrderSignature.upsert({
        where: { purchaseOrderId_kind: { purchaseOrderId: poId, kind: "APPROVED" } },
        create: { purchaseOrderId: poId, kind: "APPROVED", ...signature },
        update: signature,
      }),
    ]);
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
