export type MarketplaceWishlistItem = {
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  variantName?: string;
  sku: string;
  price: number;
  image?: string;
  addedAt: string;
};

export type MarketplaceSavedAddress = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  isDefault: boolean;
};

export type PaymentMethodType = "card" | "gcash" | "bank_transfer";

export type MarketplacePaymentMethod = {
  id: string;
  type: PaymentMethodType;
  label: string;
  last4?: string;
  isDefault: boolean;
};

export type MarketplaceCustomerReview = {
  id: string;
  productId: string;
  productName: string;
  productSlug?: string;
  rating: number;
  text: string;
  createdAt: string;
  images?: string[];
  featured?: boolean;
};

export const PREMIUM_POINTS_THRESHOLD = 500;
export const PREMIUM_ORDER_COUNT = 5;
export const PREMIUM_SPEND_THRESHOLD = 10_000;
