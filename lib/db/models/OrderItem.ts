import { Schema, model, models, type Document, type Types } from "mongoose";

export interface IOrderItem extends Document {
  tenantId: Types.ObjectId;
  orderId: Types.ObjectId;
  branchId: Types.ObjectId;
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
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
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

OrderItemSchema.index({ tenantId: 1, orderId: 1 });
OrderItemSchema.index({ tenantId: 1, productId: 1, createdAt: -1 });

export const OrderItem = models.OrderItem || model<IOrderItem>("OrderItem", OrderItemSchema);
