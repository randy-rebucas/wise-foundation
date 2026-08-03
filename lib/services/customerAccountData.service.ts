import { prisma } from "@/lib/db/prisma";
import type {
  MarketplaceCustomerReview,
  MarketplacePaymentMethod,
  MarketplaceSavedAddress,
  MarketplaceWishlistItem,
} from "@/lib/types/customerAccount";
import {
  customerReviewSchema,
  paymentMethodSchema,
  savedAddressSchema,
  wishlistItemSchema,
} from "@/lib/validations/customerAccount.schema";
import type { z } from "zod";

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function assertCustomerExists(userId: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, role: "CUSTOMER", deletedAt: null } });
  if (!user) throw new Error("Account not found");
  return user;
}

export async function getCustomerWishlist(userId: string): Promise<MarketplaceWishlistItem[]> {
  const rows = await prisma.userWishlistItem.findMany({ where: { userId } });
  return rows.map((r) => ({
    productId: r.productId,
    variantId: r.variantId,
    slug: r.slug,
    name: r.name,
    variantName: r.variantName ?? undefined,
    sku: r.sku,
    price: r.price,
    image: r.image ?? undefined,
    addedAt: r.addedAt,
  }));
}

export async function addCustomerWishlistItem(
  userId: string,
  item: z.infer<typeof wishlistItemSchema>
): Promise<MarketplaceWishlistItem[]> {
  await assertCustomerExists(userId);

  const exists = await prisma.userWishlistItem.findFirst({
    where: { userId, productId: item.productId, variantId: item.variantId ?? null },
  });
  if (!exists) {
    await prisma.userWishlistItem.create({
      data: { id: newId("wish"), userId, ...item, addedAt: new Date().toISOString() },
    });
  }
  return getCustomerWishlist(userId);
}

export async function removeCustomerWishlistItem(
  userId: string,
  productId: string,
  variantId: string | null
): Promise<MarketplaceWishlistItem[]> {
  await assertCustomerExists(userId);
  await prisma.userWishlistItem.deleteMany({ where: { userId, productId, variantId } });
  return getCustomerWishlist(userId);
}

export async function getCustomerSavedAddresses(userId: string): Promise<MarketplaceSavedAddress[]> {
  const rows = await prisma.userSavedAddress.findMany({ where: { userId } });
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    fullName: r.fullName,
    phone: r.phone,
    line1: r.line1,
    line2: r.line2 ?? undefined,
    city: r.city,
    region: r.region,
    postalCode: r.postalCode,
    isDefault: r.isDefault,
  }));
}

export async function addCustomerSavedAddress(
  userId: string,
  input: z.infer<typeof savedAddressSchema>
): Promise<MarketplaceSavedAddress[]> {
  await assertCustomerExists(userId);

  const existingCount = await prisma.userSavedAddress.count({ where: { userId } });
  const isDefault = input.isDefault ?? existingCount === 0;

  await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.userSavedAddress.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    await tx.userSavedAddress.create({
      data: { id: newId("addr"), userId, ...input, isDefault },
    });
  });

  return getCustomerSavedAddresses(userId);
}

export async function removeCustomerSavedAddress(
  userId: string,
  addressId: string
): Promise<MarketplaceSavedAddress[]> {
  await assertCustomerExists(userId);

  await prisma.$transaction(async (tx) => {
    await tx.userSavedAddress.deleteMany({ where: { id: addressId, userId } });
    const remaining = await tx.userSavedAddress.findMany({ where: { userId } });
    if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
      await tx.userSavedAddress.update({ where: { id: remaining[0]!.id }, data: { isDefault: true } });
    }
  });

  return getCustomerSavedAddresses(userId);
}

export async function setCustomerDefaultAddress(
  userId: string,
  addressId: string
): Promise<MarketplaceSavedAddress[]> {
  await assertCustomerExists(userId);

  await prisma.$transaction([
    prisma.userSavedAddress.updateMany({ where: { userId }, data: { isDefault: false } }),
    prisma.userSavedAddress.updateMany({ where: { userId, id: addressId }, data: { isDefault: true } }),
  ]);

  return getCustomerSavedAddresses(userId);
}

export async function getCustomerPaymentMethods(userId: string): Promise<MarketplacePaymentMethod[]> {
  const rows = await prisma.userPaymentMethod.findMany({ where: { userId } });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    label: r.label,
    last4: r.last4 ?? undefined,
    isDefault: r.isDefault,
  }));
}

export async function addCustomerPaymentMethod(
  userId: string,
  input: z.infer<typeof paymentMethodSchema>
): Promise<MarketplacePaymentMethod[]> {
  await assertCustomerExists(userId);

  const existingCount = await prisma.userPaymentMethod.count({ where: { userId } });
  const isDefault = input.isDefault ?? existingCount === 0;

  await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.userPaymentMethod.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    await tx.userPaymentMethod.create({
      data: { id: newId("pay"), userId, ...input, isDefault },
    });
  });

  return getCustomerPaymentMethods(userId);
}

export async function removeCustomerPaymentMethod(
  userId: string,
  methodId: string
): Promise<MarketplacePaymentMethod[]> {
  await assertCustomerExists(userId);

  await prisma.$transaction(async (tx) => {
    await tx.userPaymentMethod.deleteMany({ where: { id: methodId, userId } });
    const remaining = await tx.userPaymentMethod.findMany({ where: { userId } });
    if (remaining.length > 0 && !remaining.some((m) => m.isDefault)) {
      await tx.userPaymentMethod.update({ where: { id: remaining[0]!.id }, data: { isDefault: true } });
    }
  });

  return getCustomerPaymentMethods(userId);
}

export async function setCustomerDefaultPaymentMethod(
  userId: string,
  methodId: string
): Promise<MarketplacePaymentMethod[]> {
  await assertCustomerExists(userId);

  await prisma.$transaction([
    prisma.userPaymentMethod.updateMany({ where: { userId }, data: { isDefault: false } }),
    prisma.userPaymentMethod.updateMany({ where: { userId, id: methodId }, data: { isDefault: true } }),
  ]);

  return getCustomerPaymentMethods(userId);
}

export async function getCustomerReviews(userId: string): Promise<MarketplaceCustomerReview[]> {
  const rows = await prisma.userReview.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({
    id: r.id,
    productId: r.productId,
    productName: r.productName,
    productSlug: r.productSlug ?? undefined,
    rating: r.rating,
    text: r.text,
    createdAt: r.createdAt,
    images: r.images ?? undefined,
    featured: r.featured,
  }));
}

const REVIEWABLE_ORDER_STATUSES = ["delivered", "completed"] as const;

async function customerPurchasedProductForReview(userId: string, productId: string): Promise<boolean> {
  const match = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        type: "MARKETPLACE",
        marketplaceCustomerUserId: userId,
        deletedAt: null,
        status: { in: [...REVIEWABLE_ORDER_STATUSES] },
      },
    },
  });
  return !!match;
}

export async function addCustomerReview(
  userId: string,
  input: z.infer<typeof customerReviewSchema>
): Promise<MarketplaceCustomerReview[]> {
  await assertCustomerExists(userId);

  const canReview = await customerPurchasedProductForReview(userId, input.productId);
  if (!canReview) {
    throw new Error("You can only review products from a delivered order");
  }

  const duplicate = await prisma.userReview.findFirst({ where: { userId, productId: input.productId } });
  if (duplicate) throw new Error("You have already reviewed this product");

  let productSlug = input.productSlug;
  if (!productSlug) {
    const product = await prisma.product.findUnique({ where: { id: input.productId }, select: { slug: true } });
    productSlug = product?.slug;
  }

  await prisma.userReview.create({
    data: {
      id: newId("rev"),
      userId,
      productId: input.productId,
      productName: input.productName,
      productSlug,
      rating: input.rating,
      text: input.text.trim(),
      createdAt: new Date().toISOString(),
    },
  });

  return getCustomerReviews(userId);
}

export type CustomerDataExport = {
  exportedAt: string;
  profile: {
    name: string;
    email: string;
    phone: string | null;
    createdAt: Date;
    lastLoginAt: Date | null;
    emailVerified: boolean;
  };
  savedAddresses: MarketplaceSavedAddress[];
  paymentMethods: { type: string; label: string; last4: string | null }[];
  wishlist: MarketplaceWishlistItem[];
  reviews: MarketplaceCustomerReview[];
  orders: {
    orderNumber: string;
    status: string;
    total: number;
    createdAt: Date;
    shippingAddress: unknown;
    items: { productName: string; sku: string; quantity: number; unitPrice: number }[];
  }[];
};

/** Full data export for a customer account (GDPR-style "download my data"). */
export async function exportCustomerData(userId: string): Promise<CustomerDataExport | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { name: true, email: true, phone: true, createdAt: true, lastLoginAt: true, emailVerified: true },
  });
  if (!user) return null;

  const [savedAddresses, paymentMethods, wishlist, reviews, orders] = await Promise.all([
    getCustomerSavedAddresses(userId),
    getCustomerPaymentMethods(userId),
    getCustomerWishlist(userId),
    getCustomerReviews(userId),
    prisma.order.findMany({
      where: { marketplaceCustomerUserId: userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { orderItems: { select: { productName: true, sku: true, quantity: true, unitPrice: true } } },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      name: user.name,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      emailVerified: user.emailVerified,
    },
    savedAddresses,
    paymentMethods: paymentMethods.map((pm) => ({ type: pm.type, label: pm.label, last4: pm.last4 ?? null })),
    wishlist,
    reviews,
    orders: orders.map((o) => ({
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
      shippingAddress: (o.paymentDetails as { shipping?: unknown } | null)?.shipping ?? null,
      items: o.orderItems.map((i) => ({
        productName: i.productName,
        sku: i.sku,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    })),
  };
}

export type CustomerOrderDetail = {
  _id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
  paidAt: string | null;
  shipSummary: string;
  shipping: {
    fullName: string;
    email: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postalCode: string;
  } | null;
  items: {
    productId: string;
    productName: string;
    productSlug?: string;
    variantName?: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    total: number;
    thumbnailUrl: string | null;
  }[];
  codPayment?: {
    amountDue: number;
    prepareChangeFor?: number;
    changeToReturn?: number;
  } | null;
};

type MarketplacePaymentDetails = {
  shipping?: CustomerOrderDetail["shipping"];
  codPayment?: { amountDue: number; prepareChangeFor?: number; changeToReturn?: number };
};

export async function getMyMarketplaceOrderDetail(
  customerUserId: string,
  orderId: string
): Promise<CustomerOrderDetail | null> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, type: "MARKETPLACE", marketplaceCustomerUserId: customerUserId, deletedAt: null },
  });

  if (!order) return null;

  const lineItems = await prisma.orderItem.findMany({
    where: { orderId: order.id },
    select: { productId: true, productName: true, variantName: true, sku: true, quantity: true, unitPrice: true, total: true },
  });

  const productIds = lineItems.map((i) => i.productId);
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds }, deletedAt: null },
        select: { id: true, images: true, slug: true },
      })
    : [];
  const imageByProductId = new Map(products.map((p) => [p.id, p.images?.[0] ?? null]));
  const slugByProductId = new Map(products.map((p) => [p.id, p.slug]));

  const details = order.paymentDetails as MarketplacePaymentDetails | null;
  const ship = details?.shipping ?? null;
  const parts = ship ? [ship.line1, ship.city, ship.region].filter(Boolean) : [];
  const shipSummary = parts.length > 0 ? parts.join(" · ") : "—";

  return {
    _id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    total: order.total,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    shipSummary,
    shipping: ship,
    items: lineItems.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productSlug: slugByProductId.get(item.productId),
      variantName: item.variantName ?? undefined,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
      thumbnailUrl: imageByProductId.get(item.productId) ?? null,
    })),
    codPayment: details?.codPayment ?? null,
  };
}
