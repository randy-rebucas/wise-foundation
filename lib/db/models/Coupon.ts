import { Schema, model, models, Types, type Document } from "mongoose";

export type CouponSource = "welcome" | "birthday" | "manual" | "spin";
export type CouponType = "percent" | "fixed" | "free_shipping" | "free_item";

export interface ICouponRedemption {
  customerId?: Types.ObjectId | null;
  customerEmail?: string;
  orderId: Types.ObjectId;
  redeemedAt: Date;
}

export interface ICoupon extends Document {
  code: string;
  type: CouponType;
  value: number;
  source: CouponSource;
  /** Restricts redemption to a single account (welcome/birthday coupons). Null = anyone. */
  customerId?: Types.ObjectId | null;
  /** Restricts redemption to a single email — used for guest-issued coupons (spin wheel). */
  customerEmail?: string | null;
  /** Required when type === "free_item": the specific product that must be in the cart. */
  freeItemProductId?: Types.ObjectId | null;
  /** Denormalized display label for admin lists (e.g. "Free Perfume"). */
  spinPrizeLabel?: string;
  maxRedemptions: number;
  redemptions: ICouponRedemption[];
  isActive: boolean;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CouponRedemptionSchema = new Schema<ICouponRedemption>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    customerEmail: { type: String, lowercase: true, trim: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    redeemedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    type: { type: String, required: true, enum: ["percent", "fixed", "free_shipping", "free_item"] },
    value: { type: Number, required: true, min: 0 },
    source: { type: String, required: true, enum: ["welcome", "birthday", "manual", "spin"] },
    customerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    customerEmail: { type: String, lowercase: true, trim: true, default: null },
    freeItemProductId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    spinPrizeLabel: { type: String },
    maxRedemptions: { type: Number, default: 1, min: 1 },
    redemptions: { type: [CouponRedemptionSchema], default: [] },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

CouponSchema.index({ code: 1 }, { unique: true });
CouponSchema.index({ customerId: 1, source: 1 });
CouponSchema.index({ customerEmail: 1, source: 1 });

export const Coupon = models.Coupon || model<ICoupon>("Coupon", CouponSchema);
