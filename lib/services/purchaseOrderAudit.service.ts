import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import {
  PurchaseOrderAuditLog,
  type PurchaseOrderAuditAction,
} from "@/lib/db/models/PurchaseOrderAuditLog";
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
  await connectDB();
  assertValidObjectId(input.purchaseOrderId, "purchase order id");

  return PurchaseOrderAuditLog.create({
    purchaseOrderId: input.purchaseOrderId,
    action: input.action,
    fromStatus: input.fromStatus ?? null,
    toStatus: input.toStatus ?? null,
    performedBy: new mongoose.Types.ObjectId(input.user.id),
    performedByName: input.performedByName ?? input.user.name ?? null,
    metadata: input.metadata ?? null,
  });
}

export async function listPurchaseOrderAuditLogs(purchaseOrderId: string, limit = 50) {
  await connectDB();
  assertValidObjectId(purchaseOrderId, "purchase order id");

  return PurchaseOrderAuditLog.find({ purchaseOrderId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

function assertValidObjectId(id: string, label = "ID"): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${label}`);
  }
}
