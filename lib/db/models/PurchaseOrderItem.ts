import { Schema, model, models, type Document, type Types } from "mongoose";

export interface IPurchaseOrderItem extends Document {
  tenantId: Types.ObjectId;
  purchaseOrderId: Types.ObjectId;
  productId: Types.ObjectId;
  variantId?: Types.ObjectId | null;
  productName: string;
  sku: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrderItemSchema = new Schema<IPurchaseOrderItem>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant", default: null },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

PurchaseOrderItemSchema.index({ purchaseOrderId: 1 });
PurchaseOrderItemSchema.index({ tenantId: 1, productId: 1 });

export const PurchaseOrderItem =
  models.PurchaseOrderItem ||
  model<IPurchaseOrderItem>("PurchaseOrderItem", PurchaseOrderItemSchema);
