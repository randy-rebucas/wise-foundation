import { Schema, model, models, type Document, type Types } from "mongoose";
import type { PurchaseOrderStatus } from "@/types";

export interface IPurchaseOrder extends Document {
  organizationId: Types.ObjectId;
  branchId?: Types.ObjectId | null;
  poNumber: string;
  status: PurchaseOrderStatus;
  subtotal: number;
  total: number;
  expectedDeliveryDate?: Date | null;
  notes?: string;
  createdBy: Types.ObjectId;
  approvedBy?: Types.ObjectId | null;
  approvedAt?: Date | null;
  receivedBy?: Types.ObjectId | null;
  receivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    poNumber: { type: String, required: true, unique: true },
    status: {
      type: String,
      required: true,
      enum: ["draft", "submitted", "approved", "received", "cancelled"] as PurchaseOrderStatus[],
      default: "draft",
    },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    expectedDeliveryDate: { type: Date, default: null },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    receivedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    receivedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

PurchaseOrderSchema.index({ poNumber: 1 }, { unique: true });
PurchaseOrderSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
PurchaseOrderSchema.index({ status: 1, deletedAt: 1 });

export const PurchaseOrder =
  models.PurchaseOrder || model<IPurchaseOrder>("PurchaseOrder", PurchaseOrderSchema);
