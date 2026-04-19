import { Schema, model, models, type Document, type Types } from "mongoose";
import type { StockMovementType } from "@/types";

export interface IStockMovement extends Document {
  branchId?: Types.ObjectId | null;
  organizationId?: Types.ObjectId | null;
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
  fromOrganizationId?: Types.ObjectId | null;
  toOrganizationId?: Types.ObjectId | null;
  notes?: string;
  performedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
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
    fromOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
    toOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
    notes: { type: String },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

StockMovementSchema.index({ branchId: 1, productId: 1, createdAt: -1 });
StockMovementSchema.index({ organizationId: 1, createdAt: -1 });
StockMovementSchema.index({ type: 1, createdAt: -1 });
StockMovementSchema.index({ orderId: 1 });

export const StockMovement =
  models.StockMovement || model<IStockMovement>("StockMovement", StockMovementSchema);
