import { customAlphabet } from "nanoid";
import type { ClientSession, Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Coupon, type ICoupon, type CouponSource, type CouponType } from "@/lib/db/models/Coupon";
import type { SpinPrizeDef } from "@/lib/constants/spinWheel";
import { SPIN_COUPON_VALID_DAYS } from "@/lib/constants/spinWheel";
import type { CreateCouponInput, UpdateCouponInput } from "@/lib/validations/coupon.schema";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit.service";

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

export interface CouponFilter {
  source?: CouponSource;
  isActive?: boolean;
  search?: string;
}

/** Paginated list for the admin promos page. */
export async function getCoupons(filter: CouponFilter = {}, page = 1, limit = 20) {
  await connectDB();

  const query: Record<string, unknown> = {};
  if (filter.source) query.source = filter.source;
  if (filter.isActive !== undefined) query.isActive = filter.isActive;
  if (filter.search) query.code = { $regex: filter.search.trim(), $options: "i" };

  const skip = (page - 1) * limit;
  const [coupons, total] = await Promise.all([
    Coupon.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Coupon.countDocuments(query),
  ]);

  return { coupons, total, pages: Math.ceil(total / limit) };
}

export async function getCouponById(id: string) {
  await connectDB();
  return Coupon.findById(id).lean();
}

/** Creates a staff-issued ("manual") promo code. */
export async function createManualCoupon(data: CreateCouponInput, actor?: AuditActor) {
  await connectDB();

  const code = data.code.trim().toUpperCase();
  const existing = await Coupon.findOne({ code });
  if (existing) throw new Error(`Code "${code}" already exists`);

  const coupon = await Coupon.create({
    code,
    type: data.type,
    value: data.type === "free_shipping" ? 0 : data.value,
    source: "manual",
    freeItemProductId: data.type === "free_item" ? data.freeItemProductId : null,
    spinPrizeLabel: data.spinPrizeLabel,
    maxRedemptions: data.maxRedemptions,
    isActive: data.isActive,
    expiresAt: data.expiresAt ?? null,
  });

  if (actor) {
    void writeAuditLog({
      action: "coupon.created",
      actor,
      targetId: String(coupon._id),
      targetType: "Coupon",
      metadata: { code, type: data.type },
    });
  }

  return coupon;
}

/** Updates an existing coupon. `source` and `redemptions` are never editable here. */
export async function updateCoupon(id: string, data: UpdateCouponInput, actor?: AuditActor) {
  await connectDB();

  const update: Record<string, unknown> = { ...data };
  if (update.code) update.code = (update.code as string).trim().toUpperCase();

  if (update.code) {
    const existing = await Coupon.findOne({ code: update.code, _id: { $ne: id } });
    if (existing) throw new Error(`Code "${update.code}" already exists`);
  }

  const result = await Coupon.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();

  if (result && actor) {
    void writeAuditLog({
      action: "coupon.updated",
      actor,
      targetId: id,
      targetType: "Coupon",
      metadata: { fields: Object.keys(data) },
    });
  }

  return result;
}

export interface FeaturedPromo {
  code: string;
  type: CouponType;
  value: number;
  expiresAt: string | null;
}

/** Most recently created, currently redeemable manual promo — used for marketplace home page promo rail. */
export async function getFeaturedPromo(): Promise<FeaturedPromo | null> {
  await connectDB();

  const now = new Date();
  const coupon = await Coupon.findOne({
    source: "manual",
    isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    $expr: { $lt: [{ $size: "$redemptions" }, "$maxRedemptions"] },
  })
    .sort({ createdAt: -1 })
    .select("code type value expiresAt")
    .lean();

  if (!coupon) return null;

  return {
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString() : null,
  };
}

export async function deleteCoupon(id: string, actor?: AuditActor) {
  await connectDB();

  const result = await Coupon.findByIdAndDelete(id).lean();

  if (result && actor) {
    void writeAuditLog({
      action: "coupon.deleted",
      actor,
      targetId: id,
      targetType: "Coupon",
      metadata: { code: result.code },
    });
  }

  return result;
}
