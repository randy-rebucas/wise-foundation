import { Schema, model, models, type Document, type Types } from "mongoose";

export type TransactionType = "SALE" | "REFUND" | "ADJUSTMENT";

export interface ITransaction extends Document {
  tenantId: Types.ObjectId;
  branchId: Types.ObjectId;
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
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
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

TransactionSchema.index({ tenantId: 1, branchId: 1, createdAt: -1 });
TransactionSchema.index({ tenantId: 1, orderId: 1 });
TransactionSchema.index({ tenantId: 1, type: 1, createdAt: -1 });

export const Transaction =
  models.Transaction || model<ITransaction>("Transaction", TransactionSchema);
