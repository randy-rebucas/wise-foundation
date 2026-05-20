import { Schema, model, models, type Document, type Types } from "mongoose";

export type PurchaseOrderAuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "submitted"
  | "approved"
  | "declined"
  | "cancelled"
  | "received"
  | "status_changed";

export interface IPurchaseOrderAuditLog extends Document {
  purchaseOrderId: Types.ObjectId;
  action: PurchaseOrderAuditAction;
  fromStatus?: string | null;
  toStatus?: string | null;
  performedBy: Types.ObjectId;
  performedByName?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

const PurchaseOrderAuditLogSchema = new Schema<IPurchaseOrderAuditLog>(
  {
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder", required: true },
    action: {
      type: String,
      required: true,
      enum: [
        "created",
        "updated",
        "deleted",
        "submitted",
        "approved",
        "declined",
        "cancelled",
        "received",
        "status_changed",
      ],
    },
    fromStatus: { type: String, default: null },
    toStatus: { type: String, default: null },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    performedByName: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PurchaseOrderAuditLogSchema.index({ purchaseOrderId: 1, createdAt: -1 });

export const PurchaseOrderAuditLog =
  models.PurchaseOrderAuditLog ||
  model<IPurchaseOrderAuditLog>("PurchaseOrderAuditLog", PurchaseOrderAuditLogSchema);
