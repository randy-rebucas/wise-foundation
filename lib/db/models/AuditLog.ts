import { Schema, model, models, type Document, type Types } from "mongoose";

export type AuditAction =
  | "user.created"
  | "user.updated"
  | "user.role_changed"
  | "user.deleted"
  | "user.locked"
  | "settings.updated"
  | "order.refunded"
  | "organization.created"
  | "organization.updated"
  | "organization.deleted"
  | "branch.updated"
  | "branch.deleted"
  | "member.status_changed"
  | "member.deleted"
  | "commission.paid"
  | "commission.cancelled"
  | "db.restored"
  | "db.transferred";

export interface IAuditLog extends Document {
  action: AuditAction;
  performedBy: Types.ObjectId | string;
  performedByName?: string | null;
  targetId?: string | null;
  targetType?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    performedByName: { type: String, default: null },
    targetId: { type: String, default: null },
    targetType: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ performedBy: 1, createdAt: -1 });
AuditLogSchema.index({ targetId: 1, createdAt: -1 });

export const AuditLog = models.AuditLog || model<IAuditLog>("AuditLog", AuditLogSchema);
