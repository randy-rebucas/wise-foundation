import { Schema, model, models, Types, type Document } from "mongoose";

export type CouponSource = "welcome" | "birthday" | "manual";

export interface ICouponRedemption {
  customerId: Types.ObjectId;
  orderId: Types.ObjectId;
  redeemedAt: Date;
}

export interface ICoupon extends Document {
  code: string;
  type: "percent" | "fixed";
  value: number;
  source: CouponSource;
  /** Restricts redemption to a single customer (welcome/birthday coupons). Null = anyone. */
  customerId?: Types.ObjectId | null;
  maxRedemptions: number;
  redemptions: ICouponRedemption[];
  isActive: boolean;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CouponRedemptionSchema = new Schema<ICouponRedemption>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    redeemedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    type: { type: String, required: true, enum: ["percent", "fixed"] },
    value: { type: Number, required: true, min: 0 },
    source: { type: String, required: true, enum: ["welcome", "birthday", "manual"] },
    customerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    maxRedemptions: { type: Number, default: 1, min: 1 },
    redemptions: { type: [CouponRedemptionSchema], default: [] },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

CouponSchema.index({ code: 1 }, { unique: true });
CouponSchema.index({ customerId: 1, source: 1 });

export const Coupon = models.Coupon || model<ICoupon>("Coupon", CouponSchema);
