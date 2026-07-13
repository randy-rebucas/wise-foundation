import { customAlphabet } from "nanoid";
import type { ClientSession, Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Coupon, type ICoupon } from "@/lib/db/models/Coupon";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generateCode = customAlphabet(CODE_ALPHABET, 8);

export const WELCOME_COUPON_PERCENT = 10;
export const WELCOME_COUPON_VALID_DAYS = 30;

/** Issues a single-use, customer-locked welcome coupon. Idempotent guard lives in the caller. */
export async function issueWelcomeCoupon(customerId: Types.ObjectId | string): Promise<ICoupon> {
  await connectDB();
  const expiresAt = new Date(Date.now() + WELCOME_COUPON_VALID_DAYS * 24 * 60 * 60 * 1000);
  return Coupon.create({
    code: `WELCOME${generateCode()}`,
    type: "percent",
    value: WELCOME_COUPON_PERCENT,
    source: "welcome",
    customerId,
    maxRedemptions: 1,
    isActive: true,
    expiresAt,
  });
}

export type CouponValidationResult =
  | { ok: true; couponId: Types.ObjectId; discountAmount: number; description: string }
  | { ok: false; message: string };

/** Non-throwing validation — safe to call while the customer is still editing the checkout form. */
export async function validateCoupon(
  code: string,
  customerUserId: string | null,
  subtotal: number
): Promise<CouponValidationResult> {
  await connectDB();
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, message: "Enter a coupon code" };

  const coupon = await Coupon.findOne({ code: normalized }).lean();
  if (!coupon || !coupon.isActive) {
    return { ok: false, message: "Coupon not found" };
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { ok: false, message: "This coupon has expired" };
  }
  if (coupon.customerId) {
    if (!customerUserId || String(coupon.customerId) !== String(customerUserId)) {
      return { ok: false, message: "This coupon isn't available on your account" };
    }
  }
  const alreadyRedeemedByCustomer =
    customerUserId &&
    coupon.redemptions.some(
      (r: { customerId: Types.ObjectId }) => String(r.customerId) === String(customerUserId)
    );
  if (alreadyRedeemedByCustomer) {
    return { ok: false, message: "You've already used this coupon" };
  }
  if (coupon.redemptions.length >= coupon.maxRedemptions) {
    return { ok: false, message: "This coupon has already been fully redeemed" };
  }

  const discountAmount =
    coupon.type === "percent"
      ? Math.round((subtotal * Math.min(100, coupon.value)) / 100 * 100) / 100
      : Math.min(coupon.value, subtotal);

  const description =
    coupon.type === "percent" ? `${coupon.value}% off` : `₱${coupon.value} off`;

  return { ok: true, couponId: coupon._id as Types.ObjectId, discountAmount, description };
}

/** Records a redemption. Call inside the same transaction/session used to create the order. */
export async function redeemCoupon(
  couponId: Types.ObjectId,
  customerId: Types.ObjectId,
  orderId: Types.ObjectId,
  session?: ClientSession
): Promise<void> {
  await Coupon.updateOne(
    { _id: couponId },
    { $push: { redemptions: { customerId, orderId, redeemedAt: new Date() } } },
    { session }
  );
}
