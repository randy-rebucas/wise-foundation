import { customAlphabet } from "nanoid";
import type { ClientSession, Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Coupon, type ICoupon } from "@/lib/db/models/Coupon";
import type { SpinPrizeDef } from "@/lib/constants/spinWheel";
import { SPIN_COUPON_VALID_DAYS } from "@/lib/constants/spinWheel";

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

/** Issues a single-use, email-locked coupon for a spin-wheel prize. */
export async function issueSpinCoupon(
  email: string,
  prize: SpinPrizeDef,
  freeItemProductId?: Types.ObjectId | null
): Promise<ICoupon> {
  await connectDB();
  const expiresAt = new Date(Date.now() + SPIN_COUPON_VALID_DAYS * 24 * 60 * 60 * 1000);
  return Coupon.create({
    code: `SPIN${generateCode()}`,
    type: prize.couponType,
    value: prize.value,
    source: "spin",
    customerEmail: email.trim().toLowerCase(),
    freeItemProductId: prize.requiresFreeGiftProduct ? freeItemProductId : null,
    spinPrizeLabel: prize.label,
    maxRedemptions: 1,
    isActive: true,
    expiresAt,
  });
}

export type CouponValidationResult =
  | {
      ok: true;
      couponId: Types.ObjectId;
      discountAmount: number;
      description: string;
      freeShipping?: boolean;
    }
  | { ok: false; message: string };

export type ValidateCouponOptions = {
  /** Guest/customer email — checked against email-locked coupons (spin wheel, guest checkout). */
  email?: string | null;
  /** Returns the cart line's unit price for a product, or undefined when it isn't in the cart. Required for free_item coupons. */
  cartUnitPriceForProduct?: (productId: string) => number | undefined;
  /** Pass the active transaction session when calling inside a `withTransaction`/`startTransaction` block. */
  session?: ClientSession;
};

/** Non-throwing validation — safe to call while the customer is still editing the checkout form. */
export async function validateCoupon(
  code: string,
  customerUserId: string | null,
  subtotal: number,
  opts?: ValidateCouponOptions
): Promise<CouponValidationResult> {
  await connectDB();
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, message: "Enter a coupon code" };

  const coupon = await Coupon.findOne({ code: normalized }).session(opts?.session ?? null).lean();
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
  } else if (coupon.customerEmail) {
    const email = opts?.email?.trim().toLowerCase();
    if (!email || email !== coupon.customerEmail) {
      return { ok: false, message: "This coupon isn't available for this email" };
    }
  }
  const alreadyRedeemedByCustomer =
    (customerUserId &&
      coupon.redemptions.some(
        (r: { customerId?: Types.ObjectId | null }) =>
          r.customerId && String(r.customerId) === String(customerUserId)
      )) ||
    (opts?.email &&
      coupon.redemptions.some(
        (r: { customerEmail?: string }) =>
          r.customerEmail && r.customerEmail === opts.email!.trim().toLowerCase()
      ));
  if (alreadyRedeemedByCustomer) {
    return { ok: false, message: "You've already used this coupon" };
  }
  if (coupon.redemptions.length >= coupon.maxRedemptions) {
    return { ok: false, message: "This coupon has already been fully redeemed" };
  }

  if (coupon.type === "free_shipping") {
    return {
      ok: true,
      couponId: coupon._id as Types.ObjectId,
      discountAmount: 0,
      description: "Free shipping",
      freeShipping: true,
    };
  }

  if (coupon.type === "free_item") {
    const productId = coupon.freeItemProductId ? String(coupon.freeItemProductId) : null;
    const unitPrice = productId ? opts?.cartUnitPriceForProduct?.(productId) : undefined;
    if (!productId || unitPrice === undefined) {
      return {
        ok: false,
        message: `Add ${coupon.spinPrizeLabel ?? "the free gift item"} to your cart to use this coupon`,
      };
    }
    return {
      ok: true,
      couponId: coupon._id as Types.ObjectId,
      discountAmount: Math.min(unitPrice, subtotal),
      description: coupon.spinPrizeLabel ?? "Free item",
    };
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
  customerId: Types.ObjectId | null,
  orderId: Types.ObjectId,
  session?: ClientSession,
  customerEmail?: string
): Promise<void> {
  await Coupon.updateOne(
    { _id: couponId },
    {
      $push: {
        redemptions: {
          customerId: customerId ?? null,
          customerEmail: customerEmail?.trim().toLowerCase(),
          orderId,
          redeemedAt: new Date(),
        },
      },
    },
    { session }
  );
}
