import type { Prisma, PurchaseOrderAuditAction } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { PurchaseOrderStatus, SessionUser } from "@/types";

export interface RecordPurchaseOrderAuditInput {
  purchaseOrderId: string;
  action: PurchaseOrderAuditAction;
  user: SessionUser;
  fromStatus?: PurchaseOrderStatus | string | null;
  toStatus?: PurchaseOrderStatus | string | null;
  metadata?: Record<string, unknown>;
  performedByName?: string;
}

export async function recordPurchaseOrderAudit(input: RecordPurchaseOrderAuditInput) {
  return prisma.purchaseOrderAuditLog.create({
    data: {
      purchaseOrderId: input.purchaseOrderId,
      action: input.action,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      performedBy: input.user.id,
      performedByName: input.performedByName ?? input.user.name ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function listPurchaseOrderAuditLogs(purchaseOrderId: string, limit = 50) {
  return prisma.purchaseOrderAuditLog.findMany({
    where: { purchaseOrderId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
