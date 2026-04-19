import { Schema, model, models, type Document, type Types } from "mongoose";

export type TransactionType = "SALE" | "REFUND" | "ADJUSTMENT";

export interface ITransaction extends Document {
  branchId?: Types.ObjectId | null;
  organizationId?: Types.ObjectId | null;
  orderId?: Types.ObjectId | null;
  memberId?: Types.ObjectId | null;
  type: TransactionType;
  amount: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  performedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", default: null },
    type: {
      type: String,
      required: true,
      enum: ["SALE", "REFUND", "ADJUSTMENT"] as TransactionType[],
    },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    reference: { type: String },
    notes: { type: String },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

TransactionSchema.index({ branchId: 1, createdAt: -1 });
TransactionSchema.index({ organizationId: 1, createdAt: -1 });
TransactionSchema.index({ orderId: 1 });
TransactionSchema.index({ type: 1, createdAt: -1 });

export const Transaction =
  models.Transaction || model<ITransaction>("Transaction", TransactionSchema);
