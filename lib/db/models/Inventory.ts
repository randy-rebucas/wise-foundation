import { Schema, model, models, type Document, type Types } from "mongoose";

export interface IInventory extends Document {
  branchId: Types.ObjectId;
  productId: Types.ObjectId;
  variantId?: Types.ObjectId | null;
  quantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant", default: null },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    reservedQuantity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 10, min: 0 },
  },
  { timestamps: true }
);

InventorySchema.index(
  { branchId: 1, productId: 1, variantId: 1 },
  { unique: true }
);
InventorySchema.index({ branchId: 1, quantity: 1 });

export const Inventory = models.Inventory || model<IInventory>("Inventory", InventorySchema);
