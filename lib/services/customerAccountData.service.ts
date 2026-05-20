import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Order } from "@/lib/db/models/Order";
import { OrderItem } from "@/lib/db/models/OrderItem";
import { Product } from "@/lib/db/models/Product";
import { User, type IUserMarketplace } from "@/lib/db/models/User";
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

async function getCustomerUser(userId: string) {
  await connectDB();
  if (!mongoose.isValidObjectId(userId)) return null;
  return User.findOne({ _id: userId, role: "CUSTOMER", deletedAt: null }).select("marketplace");
}

function defaultMarketplace(): IUserMarketplace {
  return {
    wishlist: [],
    savedAddresses: [],
    paymentMethods: [],
    reviews: [],
  };
}

function ensureMarketplace(raw: IUserMarketplace | null | undefined): IUserMarketplace {
  if (!raw) return defaultMarketplace();
  return {
    wishlist: [...(raw.wishlist ?? [])],
    savedAddresses: [...(raw.savedAddresses ?? [])],
    paymentMethods: [...(raw.paymentMethods ?? [])],
    reviews: [...(raw.reviews ?? [])],
  };
}

export async function getCustomerWishlist(userId: string): Promise<MarketplaceWishlistItem[]> {
  const user = await getCustomerUser(userId);
  return user?.marketplace?.wishlist ?? [];
}

export async function addCustomerWishlistItem(
  userId: string,
  item: z.infer<typeof wishlistItemSchema>
): Promise<MarketplaceWishlistItem[]> {
  await connectDB();
  const user = await User.findOne({ _id: userId, role: "CUSTOMER", deletedAt: null });
  if (!user) throw new Error("Account not found");

  const marketplace = ensureMarketplace(user.marketplace);
  const exists = marketplace.wishlist.some(
    (w: MarketplaceWishlistItem) => w.productId === item.productId && w.variantId === item.variantId
  );
  if (!exists) {
    marketplace.wishlist.push({
      ...item,
      addedAt: new Date().toISOString(),
    });
  }
  user.marketplace = marketplace;
  await user.save();
  return marketplace.wishlist;
}

export async function removeCustomerWishlistItem(
  userId: string,
  productId: string,
  variantId: string | null
): Promise<MarketplaceWishlistItem[]> {
  await connectDB();
  const user = await User.findOne({ _id: userId, role: "CUSTOMER", deletedAt: null });
  if (!user) throw new Error("Account not found");

  const marketplace = ensureMarketplace(user.marketplace);
  marketplace.wishlist = marketplace.wishlist.filter(
    (w: MarketplaceWishlistItem) => !(w.productId === productId && w.variantId === variantId)
  );
  user.marketplace = marketplace;
  await user.save();
  return marketplace.wishlist;
}

export async function getCustomerSavedAddresses(userId: string): Promise<MarketplaceSavedAddress[]> {
  const user = await getCustomerUser(userId);
  return user?.marketplace?.savedAddresses ?? [];
}

export async function addCustomerSavedAddress(
  userId: string,
  input: z.infer<typeof savedAddressSchema>
): Promise<MarketplaceSavedAddress[]> {
  await connectDB();
  const user = await User.findOne({ _id: userId, role: "CUSTOMER", deletedAt: null });
  if (!user) throw new Error("Account not found");

  const marketplace = ensureMarketplace(user.marketplace);
  const isDefault = input.isDefault ?? marketplace.savedAddresses.length === 0;
  const addresses = isDefault
    ? marketplace.savedAddresses.map((a: MarketplaceSavedAddress) => ({ ...a, isDefault: false }))
    : [...marketplace.savedAddresses];

  addresses.push({
    id: newId("addr"),
    label: input.label,
    fullName: input.fullName,
    phone: input.phone,
    line1: input.line1,
    line2: input.line2,
    city: input.city,
    region: input.region,
    postalCode: input.postalCode,
    isDefault,
  });

  marketplace.savedAddresses = addresses;
  user.marketplace = marketplace;
  await user.save();
  return addresses;
}

export async function removeCustomerSavedAddress(
  userId: string,
  addressId: string
): Promise<MarketplaceSavedAddress[]> {
  await connectDB();
  const user = await User.findOne({ _id: userId, role: "CUSTOMER", deletedAt: null });
  if (!user) throw new Error("Account not found");

  const marketplace = ensureMarketplace(user.marketplace);
  let addresses = marketplace.savedAddresses.filter((a: MarketplaceSavedAddress) => a.id !== addressId);
  if (addresses.length > 0 && !addresses.some((a: MarketplaceSavedAddress) => a.isDefault)) {
    addresses = addresses.map((a: MarketplaceSavedAddress, i: number) => ({
      ...a,
      isDefault: i === 0,
    }));
  }
  marketplace.savedAddresses = addresses;
  user.marketplace = marketplace;
  await user.save();
  return addresses;
}

export async function setCustomerDefaultAddress(
  userId: string,
  addressId: string
): Promise<MarketplaceSavedAddress[]> {
  await connectDB();
  const user = await User.findOne({ _id: userId, role: "CUSTOMER", deletedAt: null });
  if (!user) throw new Error("Account not found");

  const marketplace = ensureMarketplace(user.marketplace);
  marketplace.savedAddresses = marketplace.savedAddresses.map((a: MarketplaceSavedAddress) => ({
    ...a,
    isDefault: a.id === addressId,
  }));
  user.marketplace = marketplace;
  await user.save();
  return marketplace.savedAddresses;
}

export async function getCustomerPaymentMethods(userId: string): Promise<MarketplacePaymentMethod[]> {
  const user = await getCustomerUser(userId);
  return user?.marketplace?.paymentMethods ?? [];
}

export async function addCustomerPaymentMethod(
  userId: string,
  input: z.infer<typeof paymentMethodSchema>
): Promise<MarketplacePaymentMethod[]> {
  await connectDB();
  const user = await User.findOne({ _id: userId, role: "CUSTOMER", deletedAt: null });
  if (!user) throw new Error("Account not found");

  const marketplace = ensureMarketplace(user.marketplace);
  const isDefault = input.isDefault ?? marketplace.paymentMethods.length === 0;
  const methods = isDefault
    ? marketplace.paymentMethods.map((m: MarketplacePaymentMethod) => ({ ...m, isDefault: false }))
    : [...marketplace.paymentMethods];

  methods.push({
    id: newId("pay"),
    type: input.type,
    label: input.label,
    last4: input.last4,
    isDefault,
  });

  marketplace.paymentMethods = methods;
  user.marketplace = marketplace;
  await user.save();
  return methods;
}

export async function removeCustomerPaymentMethod(
  userId: string,
  methodId: string
): Promise<MarketplacePaymentMethod[]> {
  await connectDB();
  const user = await User.findOne({ _id: userId, role: "CUSTOMER", deletedAt: null });
  if (!user) throw new Error("Account not found");

  const marketplace = ensureMarketplace(user.marketplace);
  let methods = marketplace.paymentMethods.filter((m: MarketplacePaymentMethod) => m.id !== methodId);
  if (methods.length > 0 && !methods.some((m: MarketplacePaymentMethod) => m.isDefault)) {
    methods = methods.map((m: MarketplacePaymentMethod, i: number) => ({
      ...m,
      isDefault: i === 0,
    }));
  }
  marketplace.paymentMethods = methods;
  user.marketplace = marketplace;
  await user.save();
  return methods;
}

export async function setCustomerDefaultPaymentMethod(
  userId: string,
  methodId: string
): Promise<MarketplacePaymentMethod[]> {
  await connectDB();
  const user = await User.findOne({ _id: userId, role: "CUSTOMER", deletedAt: null });
  if (!user) throw new Error("Account not found");

  const marketplace = ensureMarketplace(user.marketplace);
  marketplace.paymentMethods = marketplace.paymentMethods.map((m: MarketplacePaymentMethod) => ({
    ...m,
    isDefault: m.id === methodId,
  }));
  user.marketplace = marketplace;
  await user.save();
  return marketplace.paymentMethods;
}

export async function getCustomerReviews(userId: string): Promise<MarketplaceCustomerReview[]> {
  const user = await getCustomerUser(userId);
  const reviews = user?.marketplace?.reviews ?? [];
  return [...reviews].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function addCustomerReview(
  userId: string,
  input: z.infer<typeof customerReviewSchema>
): Promise<MarketplaceCustomerReview[]> {
  await connectDB();
  const user = await User.findOne({ _id: userId, role: "CUSTOMER", deletedAt: null });
  if (!user) throw new Error("Account not found");

  const marketplace = ensureMarketplace(user.marketplace);
  const duplicate = marketplace.reviews.some(
    (r: MarketplaceCustomerReview) => r.productId === input.productId
  );
  if (duplicate) throw new Error("You have already reviewed this product");

  marketplace.reviews.push({
    id: newId("rev"),
    productId: input.productId,
    productName: input.productName,
    productSlug: input.productSlug,
    rating: input.rating,
    text: input.text.trim(),
    createdAt: new Date().toISOString(),
  });

  user.marketplace = marketplace;
  await user.save();
  return getCustomerReviews(userId);
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

export async function getMyMarketplaceOrderDetail(
  customerUserId: string,
  orderId: string
): Promise<CustomerOrderDetail | null> {
  await connectDB();
  if (!mongoose.isValidObjectId(customerUserId) || !mongoose.isValidObjectId(orderId)) {
    return null;
  }

  const order = await Order.findOne({
    _id: orderId,
    type: "MARKETPLACE",
    marketplaceCustomerUserId: new mongoose.Types.ObjectId(customerUserId),
    deletedAt: null,
  }).lean();

  if (!order) return null;

  const lineItems = await OrderItem.find({ orderId: order._id })
    .select("productId productName variantName sku quantity unitPrice total")
    .lean();

  const productIds = lineItems.map((i) => i.productId as mongoose.Types.ObjectId);
  const products =
    productIds.length > 0
      ? await Product.find({ _id: { $in: productIds }, deletedAt: null }).select("images").lean()
      : [];
  const imageByProductId = new Map(
    products.map((p) => [String(p._id), (p.images?.[0] as string | undefined) ?? null])
  );

  const ship = order.marketplaceShipping as CustomerOrderDetail["shipping"];
  const parts = ship ? [ship.line1, ship.city, ship.region].filter(Boolean) : [];
  const shipSummary = parts.length > 0 ? parts.join(" · ") : "—";

  return {
    _id: String(order._id),
    orderNumber: order.orderNumber,
    status: order.status,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    total: order.total,
    paymentMethod: order.paymentMethod,
    createdAt: (order.createdAt as Date).toISOString(),
    paidAt: order.paidAt ? (order.paidAt as Date).toISOString() : null,
    shipSummary,
    shipping: ship ?? null,
    items: lineItems.map((item) => ({
      productId: String(item.productId),
      productName: item.productName,
      variantName: item.variantName ?? undefined,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
      thumbnailUrl: imageByProductId.get(String(item.productId)) ?? null,
    })),
    codPayment: order.marketplaceCodPayment
      ? {
          amountDue: order.marketplaceCodPayment.amountDue,
          prepareChangeFor: order.marketplaceCodPayment.prepareChangeFor,
          changeToReturn: order.marketplaceCodPayment.changeToReturn,
        }
      : null,
  };
}
