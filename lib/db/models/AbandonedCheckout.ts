import { Schema, model, models, type Document, type Types } from "mongoose";

export interface IAbandonedCheckoutItem {
  productId: Types.ObjectId;
  variantId?: Types.ObjectId | null;
  name: string;
  variantName?: string;
  sku: string;
  image?: string;
  price: number;
  quantity: number;
}

export interface IAbandonedCheckout extends Document {
  email: string;
  fullName?: string;
  phone?: string;
  customerId?: Types.ObjectId | null;
  items: IAbandonedCheckoutItem[];
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  total: number;
  paymentMethod?: string;
  status: "open" | "recovered";
  recoveredOrderId?: Types.ObjectId | null;
  recoveredAt?: Date | null;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AbandonedCheckoutItemSchema = new Schema<IAbandonedCheckoutItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant", default: null },
    name: { type: String, required: true },
    variantName: { type: String },
    sku: { type: String, required: true },
    image: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false }
);

const AbandonedCheckoutSchema = new Schema<IAbandonedCheckout>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    fullName: { type: String, trim: true },
    phone: { type: String, trim: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    items: { type: [AbandonedCheckoutItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paymentMethod: { type: String },
    status: { type: String, enum: ["open", "recovered"], default: "open" },
    recoveredOrderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    recoveredAt: { type: Date, default: null },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AbandonedCheckoutSchema.index({ email: 1, status: 1 }, { unique: true });
AbandonedCheckoutSchema.index({ status: 1, lastSeenAt: -1 });

export const AbandonedCheckout =
  models.AbandonedCheckout || model<IAbandonedCheckout>("AbandonedCheckout", AbandonedCheckoutSchema);
