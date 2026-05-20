import { Schema, model, models, type Document, type Types } from "mongoose";
import type { PurchaseOrderStatus } from "@/types";
import type { PurchaseOrderPaymentTermsMonths } from "@/lib/utils/purchaseOrderTotals";

export interface IPurchaseOrderSignatureEmbed {
  name: string;
  userId: Types.ObjectId;
  imageDataUrl: string;
  signedAt: Date;
}

export interface IPurchaseOrderJntShipment {
  trackingNumber: string;
  billCode?: string;
  sortingCode?: string;
  status: "booked" | "in_transit" | "delivered" | "failed";
  statusLabel?: string;
  rawStatus?: string;
  bookedAt: Date;
  bookedBy: Types.ObjectId;
  lastSyncedAt?: Date | null;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity: string;
  recipientRegion: string;
  weightKg?: number;
  parcelCount?: number;
  remark?: string;
  lastError?: string;
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
  submittedSignature?: IPurchaseOrderSignatureEmbed | null;
  approvedSignature?: IPurchaseOrderSignatureEmbed | null;
  receivedBy?: Types.ObjectId | null;
  receivedAt?: Date | null;
  jntShipment?: IPurchaseOrderJntShipment | null;
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
      enum: ["draft", "submitted", "approved", "received", "cancelled"] as PurchaseOrderStatus[],
      default: "draft",
    },
    subtotal: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentTermsMonths: {
      type: Number,
      enum: [3, 6],
      default: null,
    },
    expectedDeliveryDate: { type: Date, default: null },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    submittedSignature: { type: PurchaseOrderSignatureSchema, default: null },
    approvedSignature: { type: PurchaseOrderSignatureSchema, default: null },
    receivedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    receivedAt: { type: Date, default: null },
    jntShipment: {
      trackingNumber: { type: String },
      billCode: { type: String },
      sortingCode: { type: String },
      status: {
        type: String,
        enum: ["booked", "in_transit", "delivered", "failed"],
      },
      statusLabel: { type: String },
      rawStatus: { type: String },
      bookedAt: { type: Date },
      bookedBy: { type: Schema.Types.ObjectId, ref: "User" },
      lastSyncedAt: { type: Date },
      recipientName: { type: String },
      recipientPhone: { type: String },
      recipientAddress: { type: String },
      recipientCity: { type: String },
      recipientRegion: { type: String },
      weightKg: { type: Number },
      parcelCount: { type: Number },
      remark: { type: String },
      lastError: { type: String },
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

PurchaseOrderSchema.index({ poNumber: 1 }, { unique: true });
PurchaseOrderSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
PurchaseOrderSchema.index({ status: 1, deletedAt: 1 });

export const PurchaseOrder =
  models.PurchaseOrder || model<IPurchaseOrder>("PurchaseOrder", PurchaseOrderSchema);
