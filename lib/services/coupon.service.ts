import { customAlphabet } from "nanoid";
import type { Prisma, Coupon, CouponSource, CouponType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { SpinPrizeDef } from "@/lib/constants/spinWheel";
import { SPIN_COUPON_VALID_DAYS } from "@/lib/constants/spinWheel";
import type { CreateCouponInput, UpdateCouponInput } from "@/lib/validations/coupon.schema";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit.service";
import { PRODUCT_CATEGORIES } from "@/lib/products/catalog";

function categoryLabel(category: string): string {
  return PRODUCT_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generateCode = customAlphabet(CODE_ALPHABET, 8);

export const WELCOME_COUPON_PERCENT = 10;
export const WELCOME_COUPON_VALID_DAYS = 30;

/** Issues a single-use, customer-locked welcome coupon. Idempotent guard lives in the caller. */
export async function issueWelcomeCoupon(customerId: string): Promise<Coupon> {
  const expiresAt = new Date(Date.now() + WELCOME_COUPON_VALID_DAYS * 24 * 60 * 60 * 1000);
  return prisma.coupon.create({
    data: {
      code: `WELCOME${generateCode()}`,
      type: "percent",
      value: WELCOME_COUPON_PERCENT,
      source: "welcome",
      customerId,
      maxRedemptions: 1,
      isActive: true,
      expiresAt,
    },
  });
}

/** Issues a single-use, email-locked coupon for a spin-wheel prize. */
export async function issueSpinCoupon(
  email: string,
  prize: SpinPrizeDef,
  freeItemProductId?: string | null
): Promise<Coupon> {
  const expiresAt = new Date(Date.now() + SPIN_COUPON_VALID_DAYS * 24 * 60 * 60 * 1000);
  return prisma.coupon.create({
    data: {
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
    },
  });
}

export type CouponValidationResult =
  | {
      ok: true;
      couponId: string;
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
  /** Returns the sum of cart line totals for a product category. Required for category-scoped coupons. */
  cartSubtotalForCategory?: (category: string) => number;
  /** Pass the active transaction client when calling inside a `prisma.$transaction` block. */
  tx?: Prisma.TransactionClient;
};

/** Non-throwing validation — safe to call while the customer is still editing the checkout form. */
export async function validateCoupon(
  code: string,
  customerUserId: string | null,
  subtotal: number,
  opts?: ValidateCouponOptions
): Promise<CouponValidationResult> {
  const db = opts?.tx ?? prisma;
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, message: "Enter a coupon code" };

  const coupon = await db.coupon.findUnique({ where: { code: normalized } });
  if (!coupon || !coupon.isActive) {
    return { ok: false, message: "Coupon not found" };
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { ok: false, message: "This coupon has expired" };
  }
  if (coupon.customerId) {
    if (!customerUserId || coupon.customerId !== customerUserId) {
      return { ok: false, message: "This coupon isn't available on your account" };
    }
  } else if (coupon.customerEmail) {
    const email = opts?.email?.trim().toLowerCase();
    if (!email || email !== coupon.customerEmail) {
      return { ok: false, message: "This coupon isn't available for this email" };
    }
  }

  const email = opts?.email?.trim().toLowerCase();
  const alreadyRedeemedByCustomer =
    (customerUserId || email) &&
    (await db.couponRedemption.findFirst({
      where: {
        couponId: coupon.id,
        OR: [
          ...(customerUserId ? [{ customerId: customerUserId }] : []),
          ...(email ? [{ customerEmail: email }] : []),
        ],
      },
    })) !== null;
  if (alreadyRedeemedByCustomer) {
    return { ok: false, message: "You've already used this coupon" };
  }
  if (coupon.redeemedCount >= coupon.maxRedemptions) {
    return { ok: false, message: "This coupon has already been fully redeemed" };
  }

  // Category-scoped coupons apply only against the subtotal of matching cart items.
  let scopedSubtotal = subtotal;
  if (coupon.category && coupon.type !== "free_item") {
    scopedSubtotal = opts?.cartSubtotalForCategory?.(coupon.category) ?? 0;
    if (scopedSubtotal <= 0) {
      return {
        ok: false,
        message: `Add a ${categoryLabel(coupon.category)} product to your cart to use this coupon`,
      };
    }
  }

  if (coupon.type === "free_shipping") {
    return {
      ok: true,
      couponId: coupon.id,
      discountAmount: 0,
      description: "Free shipping",
      freeShipping: true,
    };
  }

  if (coupon.type === "free_item") {
    const productId = coupon.freeItemProductId;
    const unitPrice = productId ? opts?.cartUnitPriceForProduct?.(productId) : undefined;
    if (!productId || unitPrice === undefined) {
      return {
        ok: false,
        message: `Add ${coupon.spinPrizeLabel ?? "the free gift item"} to your cart to use this coupon`,
      };
    }
    return {
      ok: true,
      couponId: coupon.id,
      discountAmount: Math.min(unitPrice, subtotal),
      description: coupon.spinPrizeLabel ?? "Free item",
    };
  }

  const discountAmount =
    coupon.type === "percent"
      ? Math.round(((scopedSubtotal * Math.min(100, coupon.value)) / 100) * 100) / 100
      : Math.min(coupon.value, scopedSubtotal);

  const description =
    (coupon.type === "percent" ? `${coupon.value}% off` : `₱${coupon.value} off`) +
    (coupon.category ? ` ${categoryLabel(coupon.category)}` : "");

  return { ok: true, couponId: coupon.id, discountAmount, description };
}

/** Records a redemption. Call inside the same transaction used to create the order. */
export async function redeemCoupon(
  couponId: string,
  customerId: string | null,
  orderId: string,
  tx?: Prisma.TransactionClient,
  customerEmail?: string
): Promise<void> {
  const db = tx ?? prisma;
  await db.couponRedemption.create({
    data: {
      couponId,
      customerId: customerId ?? null,
      customerEmail: customerEmail?.trim().toLowerCase(),
      orderId,
      redeemedAt: new Date(),
    },
  });
  await db.coupon.update({ where: { id: couponId }, data: { redeemedCount: { increment: 1 } } });
}

export interface CouponFilter {
  source?: CouponSource;
  isActive?: boolean;
  search?: string;
  category?: string;
}

/** Paginated list for the admin promos page. */
export async function getCoupons(filter: CouponFilter = {}, page = 1, limit = 20) {
  const where: Prisma.CouponWhereInput = {};
  if (filter.source) where.source = filter.source;
  if (filter.isActive !== undefined) where.isActive = filter.isActive;
  if (filter.search) where.code = { contains: filter.search.trim(), mode: "insensitive" };
  if (filter.category) where.category = filter.category as Prisma.CouponWhereInput["category"];

  const skip = (page - 1) * limit;
  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.coupon.count({ where }),
  ]);

  return { coupons, total, pages: Math.ceil(total / limit) };
}

export async function getCouponById(id: string) {
  return prisma.coupon.findUnique({ where: { id } });
}

/** Creates a staff-issued ("manual") promo code. */
export async function createManualCoupon(data: CreateCouponInput, actor?: AuditActor) {
  const code = data.code.trim().toUpperCase();
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) throw new Error(`Code "${code}" already exists`);

  const coupon = await prisma.coupon.create({
    data: {
      code,
      type: data.type,
      value: data.type === "free_shipping" ? 0 : data.value,
      source: "manual",
      freeItemProductId: data.type === "free_item" ? data.freeItemProductId : null,
      category: data.type === "free_item" ? null : data.category ?? null,
      spinPrizeLabel: data.spinPrizeLabel,
      maxRedemptions: data.maxRedemptions,
      isActive: data.isActive,
      expiresAt: data.expiresAt ?? null,
    },
  });

  if (actor) {
    void writeAuditLog({
      action: "coupon.created",
      actor,
      targetId: coupon.id,
      targetType: "Coupon",
      metadata: { code, type: data.type },
    });
  }

  return coupon;
}

/** Updates an existing coupon. `source` and redemptions are never editable here. */
export async function updateCoupon(id: string, data: UpdateCouponInput, actor?: AuditActor) {
  const update: Record<string, unknown> = { ...data };
  if (update.code) update.code = (update.code as string).trim().toUpperCase();

  if (update.code) {
    const existing = await prisma.coupon.findFirst({
      where: { code: update.code as string, id: { not: id } },
    });
    if (existing) throw new Error(`Code "${update.code}" already exists`);
  }

  const existingCoupon = await prisma.coupon.findUnique({ where: { id } });
  if (!existingCoupon) return null;

  const result = await prisma.coupon.update({ where: { id }, data: update });

  if (actor) {
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
  category: string | null;
  expiresAt: string | null;
}

/** Most recently created, currently redeemable manual promo — used for marketplace home page promo rail. */
export async function getFeaturedPromo(): Promise<FeaturedPromo | null> {
  const now = new Date();
  const candidates = await prisma.coupon.findMany({
    where: {
      source: "manual",
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      code: true,
      type: true,
      value: true,
      category: true,
      expiresAt: true,
      maxRedemptions: true,
      redeemedCount: true,
    },
  });

  const coupon = candidates.find((c) => c.redeemedCount < c.maxRedemptions);
  if (!coupon) return null;

  return {
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    category: coupon.category ?? null,
    expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString() : null,
  };
}

export async function hasSpunWheel(email: string): Promise<boolean> {
  const existing = await prisma.coupon.findFirst({ where: { source: "spin", customerEmail: email } });
  return !!existing;
}

/** Paginated list of spin-wheel-issued coupons, for the admin spin-wheel management page. */
export async function getSpinWheelCoupons(page: number, limit: number) {
  const where: Prisma.CouponWhereInput = { source: "spin" };
  const skip = (page - 1) * limit;
  const [entries, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      select: {
        code: true,
        type: true,
        value: true,
        spinPrizeLabel: true,
        customerEmail: true,
        isActive: true,
        expiresAt: true,
        redeemedCount: true,
        maxRedemptions: true,
        createdAt: true,
        redemptions: { select: { redeemedAt: true, customerEmail: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.coupon.count({ where }),
  ]);

  return { entries, total };
}

export async function deleteCoupon(id: string, actor?: AuditActor) {
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) return null;

  const result = await prisma.coupon.delete({ where: { id } });

  if (actor) {
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
