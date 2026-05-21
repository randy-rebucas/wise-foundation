import { Schema, model, models, type Document, type Types } from "mongoose";
import type { PurchaseOrderStatus } from "@/types";
import type { PurchaseOrderPaymentTermsMonths } from "@/lib/utils/purchaseOrderTotals";

export interface IPurchaseOrderSignatureEmbed {
  name: string;
  userId: Types.ObjectId;
  imageDataUrl: string;
  signedAt: Date;
}

export interface IPurchaseOrder extends Document {
  organizationId: Types.ObjectId;
  branchId?: Types.ObjectId | null;
  poNumber: string;
  title?: string;
  status: PurchaseOrderStatus;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  paymentTermsMonths?: PurchaseOrderPaymentTermsMonths | null;
  expectedDeliveryDate?: Date | null;
  notes?: string;
  createdBy: Types.ObjectId;
  approvedBy?: Types.ObjectId | null;
  approvedAt?: Date | null;
  declinedBy?: Types.ObjectId | null;
  declinedAt?: Date | null;
  declineReason?: string;
  submittedSignature?: IPurchaseOrderSignatureEmbed | null;
  approvedSignature?: IPurchaseOrderSignatureEmbed | null;
  receivedBy?: Types.ObjectId | null;
  receivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

const PurchaseOrderSignatureSchema = new Schema<IPurchaseOrderSignatureEmbed>(
  {
    name: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    imageDataUrl: { type: String, required: true },
    signedAt: { type: Date, required: true },
  },
  { _id: false }
);

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    poNumber: { type: String, required: true, unique: true },
    title: { type: String, trim: true, maxlength: 200 },
    status: {
      type: String,
      required: true,
      enum: [
        "draft",
        "submitted",
        "approved",
        "declined",
        "received",
        "cancelled",
      ] as PurchaseOrderStatus[],
      default: "draft",
    },
    subtotal: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentTermsMonths: {
      type: Schema.Types.Mixed,
      enum: [3, 6, "weekly"],
      default: null,
    },
    expectedDeliveryDate: { type: Date, default: null },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    declinedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    declinedAt: { type: Date, default: null },
    declineReason: { type: String, maxlength: 500 },
    submittedSignature: { type: PurchaseOrderSignatureSchema, default: null },
    approvedSignature: { type: PurchaseOrderSignatureSchema, default: null },
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
