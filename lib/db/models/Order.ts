import { Schema, model, models, type Document, type Types } from "mongoose";
import type { OrderType, OrderStatus } from "@/types";

export interface IOrder extends Document {
  branchId?: Types.ObjectId | null;
  organizationId?: Types.ObjectId | null;
  buyerOrganizationId?: Types.ObjectId | null;
  sellerOrganizationId?: Types.ObjectId | null;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  memberId?: Types.ObjectId | null;
  memberName?: string;
  cashierId: Types.ObjectId;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  total: number;
  amountPaid: number;
  change: number;
  paymentMethod: "cash" | "gcash" | "card" | "bank_transfer" | "credit";
  notes?: string;
  approvedAt?: Date | null;
  paidAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

const OrderSchema = new Schema<IOrder>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
    buyerOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
    sellerOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
    orderNumber: { type: String, required: true, unique: true },
    type: {
      type: String,
      required: true,
      enum: ["POS", "DISTRIBUTOR", "B2B"] as OrderType[],
      default: "POS",
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "approved", "paid", "completed", "cancelled", "refunded"] as OrderStatus[],
      default: "pending",
    },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", default: null },
    memberName: { type: String },
    cashierId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    total: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0 },
    change: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["cash", "gcash", "card", "bank_transfer", "credit"],
      default: "cash",
    },
    notes: { type: String },
    approvedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ branchId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ buyerOrganizationId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ sellerOrganizationId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ memberId: 1, createdAt: -1 });
OrderSchema.index({ createdAt: -1 });

export const Order = models.Order || model<IOrder>("Order", OrderSchema);
