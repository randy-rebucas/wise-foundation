import { Schema, model, models, type Document, type Types } from "mongoose";

export interface IOrderItem extends Document {
  orderId: Types.ObjectId;
  branchId: Types.ObjectId;
  organizationId?: Types.ObjectId | null;
  productId: Types.ObjectId;
  variantId?: Types.ObjectId | null;
  productName: string;
  variantName?: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  cost: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant", default: null },
    productName: { type: String, required: true },
    variantName: { type: String },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    cost: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

OrderItemSchema.index({ orderId: 1 });
OrderItemSchema.index({ productId: 1, createdAt: -1 });

export const OrderItem = models.OrderItem || model<IOrderItem>("OrderItem", OrderItemSchema);
