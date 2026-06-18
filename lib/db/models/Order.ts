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
  /** Recorded when status becomes `delivered` (delivery receipt). */
  deliveryReceiptNumber?: string;
  receivedByName?: string;
  deliveredAt?: Date | null;
  deliveredBy?: Types.ObjectId | null;
  /** Web marketplace shipping + buyer (guest or logged-in). */
  marketplaceShipping?: {
    fullName: string;
    email: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postalCode: string;
    shippingMethod?: string;
    shippingCost?: number;
  };
  shippingAmount?: number;
  marketplaceCardPayment?: {
    savedMethodId?: string;
    cardBrand?: string;
    cardLast4?: string;
    cardholderName?: string;
    expMonth?: string;
    expYear?: string;
  };
  marketplaceGcashPayment?: {
    savedMethodId?: string;
    accountName?: string;
    mobileLast4?: string;
    mobileMasked?: string;
  };
  marketplaceBankTransferPayment?: {
    savedMethodId?: string;
    depositorName?: string;
    depositorBank?: string;
    accountLast4?: string;
    transferReference?: string;
    depositToBankId?: string;
    depositToBankName?: string;
    depositToAccountName?: string;
    depositToAccountNumber?: string;
  };
  marketplaceCodPayment?: {
    amountDue: number;
    prepareChangeFor?: number;
    changeToReturn?: number;
    codAcknowledged: boolean;
  };
  marketplacePaymongo?: {
    paymentIntentId: string;
    paymentId?: string;
    status?: string;
  };
  marketplaceCustomerUserId?: Types.ObjectId | null;
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
      enum: ["POS", "DISTRIBUTOR", "B2B", "MARKETPLACE"] as OrderType[],
      default: "POS",
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "approved", "paid", "delivered", "completed", "cancelled", "refunded"] as OrderStatus[],
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
    deliveryReceiptNumber: { type: String, trim: true },
    receivedByName: { type: String },
    deliveredAt: { type: Date, default: null },
    deliveredBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    shippingAmount: { type: Number, default: 0, min: 0 },
    marketplaceShipping: {
      fullName: { type: String },
      email: { type: String },
      phone: { type: String },
      line1: { type: String },
      line2: { type: String },
      city: { type: String },
      region: { type: String },
      postalCode: { type: String },
      shippingMethod: { type: String },
      shippingCost: { type: Number, min: 0 },
    },
    marketplaceCardPayment: {
      savedMethodId: { type: String },
      cardBrand: { type: String },
      cardLast4: { type: String },
      cardholderName: { type: String },
      expMonth: { type: String },
      expYear: { type: String },
    },
    marketplaceGcashPayment: {
      savedMethodId: { type: String },
      accountName: { type: String },
      mobileLast4: { type: String },
      mobileMasked: { type: String },
    },
    marketplaceBankTransferPayment: {
      savedMethodId: { type: String },
      depositorName: { type: String },
      depositorBank: { type: String },
      accountLast4: { type: String },
      transferReference: { type: String },
      depositToBankId: { type: String },
      depositToBankName: { type: String },
      depositToAccountName: { type: String },
      depositToAccountNumber: { type: String },
    },
    marketplaceCodPayment: {
      amountDue: { type: Number, min: 0 },
      prepareChangeFor: { type: Number, min: 0 },
      changeToReturn: { type: Number, min: 0 },
      codAcknowledged: { type: Boolean, default: true },
    },
    marketplacePaymongo: {
      paymentIntentId: { type: String },
      paymentId: { type: String },
      status: { type: String },
    },
    marketplaceCustomerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

OrderSchema.index({ branchId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ buyerOrganizationId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ sellerOrganizationId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ memberId: 1, createdAt: -1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ type: 1, marketplaceCustomerUserId: 1, createdAt: -1 });
OrderSchema.index({ cashierId: 1, createdAt: -1 });
OrderSchema.index(
  { deliveryReceiptNumber: 1 },
  { unique: true, partialFilterExpression: { deliveryReceiptNumber: { $type: "string" } } }
);

export const Order = models.Order || model<IOrder>("Order", OrderSchema);
