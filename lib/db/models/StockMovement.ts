import { Schema, model, models, type Document, type Types } from "mongoose";
import type { StockMovementType } from "@/types";

export interface IStockMovement extends Document {
  tenantId: Types.ObjectId;
  branchId: Types.ObjectId;
  productId: Types.ObjectId;
  variantId?: Types.ObjectId | null;
  type: StockMovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  unitCost?: number;
  reference?: string;
  orderId?: Types.ObjectId | null;
  fromBranchId?: Types.ObjectId | null;
  toBranchId?: Types.ObjectId | null;
  notes?: string;
  performedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant", default: null },
    type: {
      type: String,
      required: true,
      enum: ["IN", "OUT", "TRANSFER", "ADJUSTMENT"] as StockMovementType[],
    },
    quantity: { type: Number, required: true },
    previousQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    unitCost: { type: Number },
    reference: { type: String },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    fromBranchId: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    toBranchId: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    notes: { type: String },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

StockMovementSchema.index({ tenantId: 1, branchId: 1, productId: 1, createdAt: -1 });
StockMovementSchema.index({ tenantId: 1, type: 1, createdAt: -1 });
StockMovementSchema.index({ tenantId: 1, orderId: 1 });

export const StockMovement =
  models.StockMovement || model<IStockMovement>("StockMovement", StockMovementSchema);
