import { unstable_cache } from "next/cache";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import { generateOrderNumber, formatCurrency } from "@/lib/utils";
import type { MarketplaceCheckoutInput } from "@/lib/validations/marketplace.schema";
import { markAbandonedCheckoutRecovered } from "@/lib/services/abandonedCheckout.service";
import type { ProductCategory } from "@/types";
import {
  buildMarketplaceProductFilter,
  marketplaceListedMatch,
  marketplaceProductSortSpec,
  normalizeShopTags,
  type MarketplaceShopListParams,
} from "@/lib/services/marketplaceShopFilters";
import { getCustomerDashboard } from "@/lib/services/customerDashboard.service";
import { validateCoupon, redeemCoupon } from "@/lib/services/coupon.service";
import {
  addCustomerPaymentMethod,
  addCustomerSavedAddress,
  getCustomerPaymentMethods,
} from "@/lib/services/customerAccountData.service";
import {
  cardBrandLabel,
  isValidExpiry,
  type CardBrand,
  type ResolvedMarketplaceCardPayment,
} from "@/lib/utils/cardPayment";
import {
  maskPhilippineMobile,
  normalizePhilippineMobile,
  type ResolvedMarketplaceGcashPayment,
} from "@/lib/utils/gcashPayment";
import {
  validateBankTransferEntry,
  type ResolvedMarketplaceBankTransferPayment,
} from "@/lib/utils/bankTransferPayment";
import { MARKETPLACE_COD_MIN_ORDER } from "@/lib/constants/marketplaceCod";
import {
  validateCodEntry,
  type ResolvedMarketplaceCodPayment,
} from "@/lib/utils/codPayment";
import {
  computeCheckoutShippingCost,
  computeMarketplaceOrderTotal,
  isMarketplacePaymentCaptured,
  marketplaceOrderStatusForPayment,
} from "@/lib/utils/marketplaceShipping";
import { isPaymongoConfigured, phpAmountToCentavos } from "@/lib/paymongo/config";
import { verifyMarketplacePaymongoPayment } from "@/lib/services/paymongoCheckout.service";
import { quoteMarketplaceCheckout } from "@/lib/services/marketplaceCheckoutQuote.service";

function inferBrandFromPaymentLabel(label: string): CardBrand {
  const lower = label.toLowerCase();
  if (lower.includes("visa")) return "visa";
  if (lower.includes("master")) return "mastercard";
  if (lower.includes("amex") || lower.includes("american express")) return "amex";
  return "unknown";
}

export async function resolveMarketplaceCardPayment(
  customerUserId: string | null,
  input: MarketplaceCheckoutInput
): Promise<ResolvedMarketplaceCardPayment> {
  if (input.paymentMethod !== "card") {
    throw new Error("Card payment required");
  }

  if (input.savedPaymentMethodId) {
    if (!customerUserId) throw new Error("Sign in to use a saved card");
    const methods = await getCustomerPaymentMethods(customerUserId);
    const method = methods.find((m) => m.id === input.savedPaymentMethodId);
    if (!method || method.type !== "card") throw new Error("Saved card not found");
    if (!method.last4) throw new Error("Saved card is missing card details");
    return {
      cardBrand: inferBrandFromPaymentLabel(method.label),
      cardLast4: method.last4,
      cardholderName: method.label,
      savedMethodId: method.id,
    };
  }

  const cp = input.cardPayment;
  if (!cp) throw new Error("Enter card details to pay by card");

  if (!isValidExpiry(cp.expMonth, cp.expYear)) {
    throw new Error("Card has expired or expiry date is invalid");
  }

  return {
    cardBrand: cp.cardBrand,
    cardLast4: cp.cardLast4,
    cardholderName: cp.cardholderName,
    expMonth: cp.expMonth,
    expYear: cp.expYear,
  };
}

export async function resolveMarketplaceGcashPayment(
  customerUserId: string | null,
  input: MarketplaceCheckoutInput
): Promise<ResolvedMarketplaceGcashPayment> {
  if (input.paymentMethod !== "gcash") {
    throw new Error("GCash payment required");
  }

  if (input.savedPaymentMethodId) {
    if (!customerUserId) throw new Error("Sign in to use a saved GCash account");
    const methods = await getCustomerPaymentMethods(customerUserId);
    const method = methods.find((m) => m.id === input.savedPaymentMethodId);
    if (!method || method.type !== "gcash") throw new Error("Saved GCash account not found");
    if (!method.last4) throw new Error("Saved GCash account is missing mobile details");
    return {
      accountName: method.label,
      mobileLast4: method.last4,
      mobileMasked: `GCash •••• ${method.last4}`,
      savedMethodId: method.id,
    };
  }

  const gp = input.gcashPayment;
  if (!gp) throw new Error("Enter your GCash mobile number");

  const normalized = normalizePhilippineMobile(gp.mobileNumber);
  if (!normalized) throw new Error("Enter a valid Philippine mobile number (09XX XXX XXXX)");

  return {
    accountName: gp.accountName,
    mobileLast4: normalized.slice(-4),
    mobileMasked: maskPhilippineMobile(normalized),
  };
}

export async function resolveMarketplaceBankTransferPayment(
  customerUserId: string | null,
  input: MarketplaceCheckoutInput
): Promise<ResolvedMarketplaceBankTransferPayment> {
  if (input.paymentMethod !== "bank_transfer") {
    throw new Error("Bank transfer payment required");
  }

  const bt = input.bankTransferPayment;
  if (!bt) throw new Error("Enter bank transfer details");

  let depositorName = bt.depositorName?.trim() ?? "";
  let depositorBank = bt.depositorBank?.trim() ?? "";
  let accountLast4 = bt.accountLast4;

  if (input.savedPaymentMethodId) {
    if (!customerUserId) throw new Error("Sign in to use a saved bank account");
    const methods = await getCustomerPaymentMethods(customerUserId);
    const method = methods.find((m) => m.id === input.savedPaymentMethodId);
    if (!method || method.type !== "bank_transfer") {
      throw new Error("Saved bank account not found");
    }
    depositorName = depositorName || method.label;
    if (!depositorBank) depositorBank = "Saved account";
    accountLast4 = accountLast4 ?? method.last4;
  }

  const validated = validateBankTransferEntry({
    depositorName,
    depositorBank,
    accountLast4: accountLast4 ?? "",
    transferReference: bt.transferReference,
    depositToBankId: bt.depositToBankId,
  });

  if (!validated.ok) throw new Error(validated.error);

  if (input.savedPaymentMethodId) {
    return { ...validated.resolved, savedMethodId: input.savedPaymentMethodId };
  }

  return validated.resolved;
}

export async function resolveMarketplaceCodPayment(
  input: MarketplaceCheckoutInput,
  amountDue: number,
  currency = "PHP"
): Promise<ResolvedMarketplaceCodPayment> {
  if (input.paymentMethod !== "cash") {
    throw new Error("Cash on delivery payment required");
  }

  const cp = input.codPayment;
  if (!cp?.codAcknowledged) {
    throw new Error("Confirm cash on delivery terms to continue");
  }

  const validated = validateCodEntry({
    acknowledged: true,
    amountDue,
    prepareChangeFor: cp.prepareChangeFor,
    minOrderAmount: MARKETPLACE_COD_MIN_ORDER,
    currency,
  });

  if (!validated.ok) throw new Error(validated.error);
  return validated.resolved;
}

const listedFilter: Prisma.ProductWhereInput = { ...marketplaceListedMatch };

export async function listMarketplaceProductSlugs(): Promise<
  { slug: string; updatedAt?: Date }[]
> {
  const rows = await prisma.product.findMany({
    where: listedFilter,
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  return rows;
}

export const getMarketplaceFulfillmentContext = cache(async (): Promise<{
  branchId: string;
  organizationId: string | null;
}> => {
  const settings = await prisma.appSettings.findFirst({ orderBy: { id: "asc" } });
  let branch = settings?.marketplaceFulfillmentBranchId
    ? await prisma.branch.findUnique({ where: { id: settings.marketplaceFulfillmentBranchId } })
    : null;

  if (!branch) {
    const hq = await prisma.branch.findFirst({ where: { isHeadOffice: true, deletedAt: null, isActive: true } });
    branch = hq ?? (await prisma.branch.findFirst({ where: { deletedAt: null, isActive: true }, orderBy: { id: "asc" } }));
    if (!branch) {
      throw new Error(
        "No branch is available to fulfill online orders. Create a branch in Admin first."
      );
    }
  }
  return { branchId: branch.id, organizationId: branch.organizationId ?? null };
});

export async function resolveMarketplaceCashierId(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", deletedAt: null, isActive: true },
    orderBy: { id: "asc" },
  });
  if (!admin) throw new Error("No administrator account found for marketplace orders");
  return admin.id;
}

export type CategoryFeaturedProduct = {
  productId: string;
  name: string;
  slug: string;
  image: string;
};

export type MarketplaceCategoryShowcase = {
  /** Newest listed product with an image in each category. */
  featured: Partial<Record<ProductCategory, CategoryFeaturedProduct>>;
  catalog: CategoryFeaturedProduct | null;
};

export type MarketplaceCategorySampleImages = {
  byCategory: Partial<Record<ProductCategory, string>>;
  featured: Partial<Record<ProductCategory, CategoryFeaturedProduct>>;
  catalog: string | null;
  catalogProduct: CategoryFeaturedProduct | null;
};

const _cachedCategoryShowcase = unstable_cache(
  async (): Promise<MarketplaceCategoryShowcase> => {
    // DISTINCT ON picks, per category, the most-recently-updated listed product with an image.
    const grouped = await prisma.$queryRaw<
      { category: ProductCategory; id: string; name: string; slug: string; image: string }[]
    >`
      SELECT DISTINCT ON (category) category, id, name, slug, images[1] AS image
      FROM "Product"
      WHERE "deletedAt" IS NULL AND "isActive" = true AND "marketplaceListed" = true
        AND array_length(images, 1) > 0
      ORDER BY category, "updatedAt" DESC
    `;

    const featured: Partial<Record<ProductCategory, CategoryFeaturedProduct>> = {};
    for (const row of grouped) {
      featured[row.category] = { productId: row.id, name: row.name, slug: row.slug, image: row.image };
    }

    const catalogDoc = await prisma.product.findFirst({
      where: { deletedAt: null, isActive: true, marketplaceListed: true },
      select: { id: true, name: true, slug: true, images: true },
      orderBy: { updatedAt: "desc" },
    });

    const catalog =
      catalogDoc?.images?.[0]
        ? { productId: catalogDoc.id, name: catalogDoc.name, slug: catalogDoc.slug, image: catalogDoc.images[0] }
        : featured.wellness ?? featured.cosmetics ?? featured.homecare ?? featured.scent ?? null;

    return { featured, catalog };
  },
  ["marketplace-category-showcase"],
  { revalidate: 120, tags: ["marketplace-products"] }
);

export async function getMarketplaceCategoryShowcase(): Promise<MarketplaceCategoryShowcase> {
  return _cachedCategoryShowcase();
}

export async function getMarketplaceCategorySampleImages(): Promise<MarketplaceCategorySampleImages> {
  const { featured, catalog } = await getMarketplaceCategoryShowcase();
  const byCategory: Partial<Record<ProductCategory, string>> = {};
  for (const [key, product] of Object.entries(featured) as [
    ProductCategory,
    CategoryFeaturedProduct,
  ][]) {
    byCategory[key] = product.image;
  }
  return {
    byCategory,
    featured,
    catalog: catalog?.image ?? null,
    catalogProduct: catalog,
  };
}

const _cachedShopFacets = unstable_cache(
  async () => {
    const [total, categoryRows, priceRow, tagRows] = await Promise.all([
      prisma.product.count({ where: marketplaceListedMatch }),
      prisma.product.groupBy({
        by: ["category"],
        where: marketplaceListedMatch,
        _count: { _all: true },
      }),
      prisma.product.aggregate({
        where: marketplaceListedMatch,
        _min: { retailPrice: true },
        _max: { retailPrice: true },
      }),
      prisma.$queryRaw<{ tag: string; count: bigint }[]>`
        SELECT lower(tag) AS tag, count(*)::bigint AS count
        FROM "Product", unnest(tags) AS tag
        WHERE "deletedAt" IS NULL AND "isActive" = true AND "marketplaceListed" = true AND tag <> ''
        GROUP BY lower(tag)
        ORDER BY count DESC, tag ASC
        LIMIT 32
      `,
    ]);

    const categoryCounts: Partial<Record<ProductCategory, number>> = {};
    for (const row of categoryRows) {
      categoryCounts[row.category] = row._count._all;
    }

    return {
      total,
      categoryCounts,
      priceMin: priceRow._min.retailPrice ?? 0,
      priceMax: priceRow._max.retailPrice ?? 0,
      tags: tagRows.map((t) => ({ tag: t.tag, count: Number(t.count) })),
    };
  },
  ["marketplace-shop-facets"],
  { revalidate: 120, tags: ["marketplace-products"] }
);

export async function getMarketplaceShopFacets() {
  return _cachedShopFacets();
}

const _cachedListMarketplaceProducts = unstable_cache(
  async (branchId: string, params: MarketplaceShopListParams) => {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(48, Math.max(1, params.limit ?? 12));
    const skip = (page - 1) * limit;
    const tags = normalizeShopTags(params.tags);
    const sortKey = params.sort ?? "featured";

    let where = buildMarketplaceProductFilter({
      category: params.category,
      search: params.search,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      tags,
    });

    if (params.inStockOnly) {
      const stocked = await prisma.inventory.groupBy({
        by: ["productId"],
        where: { branchId, quantity: { gt: 0 } },
      });
      const ids = stocked.map((r) => r.productId);
      where = { AND: [where, { id: { in: ids.length ? ids : ["__none__"] } }] };
    }

    const orderBy = marketplaceProductSortSpec(sortKey);

    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          images: true,
          video: true,
          retailPrice: true,
          category: true,
          sku: true,
          shortDescription: true,
          description: true,
          tags: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    const ids = rows.map((r) => r.id);
    const inv = ids.length === 0 ? [] : await prisma.inventory.findMany({ where: { branchId, productId: { in: ids } } });
    const stockByProduct = new Map<string, number>();
    for (const row of inv) {
      stockByProduct.set(row.productId, (stockByProduct.get(row.productId) ?? 0) + row.quantity);
    }

    return {
      data: rows.map((p) => ({
        _id: p.id,
        name: p.name,
        slug: p.slug,
        images: p.images ?? [],
        video: p.video,
        retailPrice: p.retailPrice,
        category: p.category,
        sku: p.sku,
        shortDescription: p.shortDescription,
        description: p.description,
        tags: p.tags ?? [],
        stock: stockByProduct.get(p.id) ?? 0,
      })),
      meta: { page, limit, total, hasMore: skip + rows.length < total, sort: sortKey },
    };
  },
  ["marketplace-products-list"],
  { revalidate: 60, tags: ["marketplace-products"] }
);

export async function listMarketplaceProducts(params: MarketplaceShopListParams) {
  const { branchId } = await getMarketplaceFulfillmentContext();
  return _cachedListMarketplaceProducts(branchId, params);
}

export type MarketplaceAd = {
  id: string;
  creativeType: "image" | "video";
  creativeUrl: string;
  posterUrl?: string;
  headline?: string;
  caption?: string;
  product: { id: string; name: string; slug: string; image: string | null; price: number };
};

export async function listMarketplaceAds(limit = 8): Promise<MarketplaceAd[]> {
  const now = new Date();
  const ads = await prisma.ad.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: limit,
    include: { product: { select: { name: true, slug: true, images: true, retailPrice: true } } },
  });

  return ads.map((ad) => ({
    id: ad.id,
    creativeType: ad.creativeType,
    creativeUrl: ad.creativeUrl,
    posterUrl: ad.posterUrl ?? undefined,
    headline: ad.headline ?? undefined,
    caption: ad.caption ?? undefined,
    product: {
      id: ad.productId,
      name: ad.product.name,
      slug: ad.product.slug,
      image: ad.product.images?.[0] ?? null,
      price: ad.product.retailPrice,
    },
  }));
}

export async function listPublishedBlogPosts() {
  return prisma.blogPost.findMany({
    where: { isPublished: true, deletedAt: null },
    orderBy: { publishedAt: "desc" },
  });
}

export async function getPublishedBlogPostBySlug(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug: slug.toLowerCase().trim(), isPublished: true, deletedAt: null },
  });
}

export async function getMarketplaceProductBySlug(slug: string) {
  const { branchId } = await getMarketplaceFulfillmentContext();
  const product = await prisma.product.findFirst({
    where: { slug: slug.toLowerCase().trim(), ...listedFilter },
  });
  if (!product) return null;

  const variants = await prisma.productVariant.findMany({
    where: { productId: product.id, deletedAt: null, isActive: true },
    orderBy: { name: "asc" },
  });

  const inv = await prisma.inventory.findMany({ where: { branchId, productId: product.id } });
  const qtyKey = (productId: string, variantId: string | null) => `${productId}:${variantId ?? ""}`;
  const qtyMap = new Map<string, number>();
  for (const row of inv) {
    const k = qtyKey(row.productId, row.variantId);
    qtyMap.set(k, (qtyMap.get(k) ?? 0) + row.quantity);
  }

  const baseStock = qtyMap.get(qtyKey(product.id, null)) ?? 0;

  const variantRows = variants.map((v) => ({
    _id: v.id,
    name: v.name,
    sku: v.sku,
    retailPrice: v.retailPrice,
    images: v.images ?? [],
    stock: qtyMap.get(qtyKey(product.id, v.id)) ?? 0,
  }));

  return {
    _id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    description: product.description,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    category: product.category,
    sku: product.sku,
    images: product.images ?? [],
    video: product.video,
    retailPrice: product.retailPrice,
    baseStock,
    variants: variantRows,
    hasVariants: variantRows.length > 0,
  };
}

type MarketplacePaymentDetails = {
  shipping?: {
    fullName: string;
    email: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postalCode: string;
    shippingMethod: string;
    shippingCost: number;
  };
  cardPayment?: {
    savedMethodId?: string;
    cardBrand: CardBrand;
    cardLast4: string;
    cardholderName: string;
    expMonth?: string;
    expYear?: string;
  };
  gcashPayment?: {
    savedMethodId?: string;
    accountName: string;
    mobileLast4: string;
    mobileMasked: string;
  };
  bankTransferPayment?: ResolvedMarketplaceBankTransferPayment;
  codPayment?: {
    amountDue: number;
    prepareChangeFor?: number;
    changeToReturn?: number;
    codAcknowledged: boolean;
  };
  paymongo?: { paymentIntentId: string; paymentId?: string; status: string };
};

export async function placeMarketplaceOrder(
  input: MarketplaceCheckoutInput,
  opts?: { customerUserId?: string | null }
) {
  const customerUserId = opts?.customerUserId ?? null;
  const appSettings = await prisma.appSettings.findFirst({ orderBy: { id: "asc" } });
  const currency = appSettings?.currency ?? "PHP";

  let cardPaymentRecord: ResolvedMarketplaceCardPayment | undefined;
  let gcashPaymentRecord: ResolvedMarketplaceGcashPayment | undefined;
  let paymongoRecord:
    | { paymentIntentId: string; paymentId?: string; status: string }
    | undefined;

  const paymongoEnabled = isPaymongoConfigured();
  if (!paymongoEnabled && input.paymentMethod !== "cash") {
    throw new Error(
      "Only cash on delivery is available until PayMongo API keys are configured"
    );
  }
  if (
    paymongoEnabled &&
    (input.paymentMethod === "card" || input.paymentMethod === "gcash") &&
    !input.paymongoPaymentIntentId
  ) {
    throw new Error("Complete payment with PayMongo before placing your order");
  }

  if (!input.paymongoPaymentIntentId) {
    if (input.paymentMethod === "card") {
      cardPaymentRecord = await resolveMarketplaceCardPayment(customerUserId, input);
    }
    if (input.paymentMethod === "gcash") {
      gcashPaymentRecord = await resolveMarketplaceGcashPayment(customerUserId, input);
    }
  }

  let bankTransferPaymentRecord: ResolvedMarketplaceBankTransferPayment | undefined;
  if (input.paymentMethod === "bank_transfer") {
    bankTransferPaymentRecord = await resolveMarketplaceBankTransferPayment(
      customerUserId,
      input
    );
  }

  const { branchId, organizationId } = await getMarketplaceFulfillmentContext();
  const cashierId = await resolveMarketplaceCashierId();

  const result = await prisma.$transaction(async (tx) => {
    type Line = {
      productId: string;
      variantId: string | null;
      name: string;
      variantName?: string;
      sku: string;
      quantity: number;
      unitPrice: number;
    };

    const lines: Line[] = [];

    // Batch-fetch products, variants, and inventory instead of N queries per item
    const allProductIds = input.items.map((i) => i.productId);
    const allVariantIds = input.items.filter((i) => i.variantId).map((i) => i.variantId!);

    const [productDocs, variantDocs, variantCountRows, inventoryDocs] = await Promise.all([
      tx.product.findMany({ where: { id: { in: allProductIds }, ...listedFilter } }),
      allVariantIds.length > 0
        ? tx.productVariant.findMany({ where: { id: { in: allVariantIds }, deletedAt: null, isActive: true } })
        : Promise.resolve([]),
      tx.productVariant.groupBy({
        by: ["productId"],
        where: { productId: { in: allProductIds }, deletedAt: null, isActive: true },
        _count: { _all: true },
      }),
      tx.inventory.findMany({ where: { branchId, productId: { in: allProductIds } } }),
    ]);

    const productMap = new Map(productDocs.map((p) => [p.id, p]));
    const variantMap = new Map(variantDocs.map((v) => [v.id, v]));
    const variantCountMap = new Map(variantCountRows.map((r) => [r.productId, r._count._all]));
    // Key: "productId:variantId" (variantId empty string when null)
    const invMap = new Map(inventoryDocs.map((inv) => [`${inv.productId}:${inv.variantId ?? ""}`, inv]));

    for (const raw of input.items) {
      const product = productMap.get(raw.productId);
      if (!product) throw new Error(`Product not available: ${raw.productId}`);

      let unitPrice = product.retailPrice;
      let sku = product.sku;
      const name = product.name;
      let variantName: string | undefined;
      let variantId: string | null = null;
      let invKey: string;

      if (raw.variantId) {
        const v = variantMap.get(raw.variantId);
        if (!v || v.productId !== product.id) {
          throw new Error(`Invalid variant for product ${product.name}`);
        }
        unitPrice = v.retailPrice;
        sku = v.sku;
        variantName = v.name;
        variantId = v.id;
        invKey = `${product.id}:${v.id}`;
      } else {
        if ((variantCountMap.get(product.id) ?? 0) > 0) {
          throw new Error(`Please choose a variant for ${product.name}`);
        }
        invKey = `${product.id}:`;
      }

      const inv = invMap.get(invKey);
      if (!inv || inv.quantity < raw.quantity) {
        throw new Error(`Insufficient stock for ${name}${variantName ? ` (${variantName})` : ""}`);
      }

      lines.push({ productId: product.id, variantId, name, variantName, sku, quantity: raw.quantity, unitPrice });
    }

    const subtotal = Math.round(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0) * 100) / 100;
    let discountPercent = 0;
    if (customerUserId) {
      const dashboard = await getCustomerDashboard(customerUserId);
      if (dashboard) {
        discountPercent = dashboard.memberDiscountPercent;
      }
    }
    const memberDiscountAmount =
      discountPercent > 0
        ? Math.round(((subtotal * Math.min(100, discountPercent)) / 100) * 100) / 100
        : 0;

    const cartUnitPriceForProduct = (productId: string): number | undefined =>
      lines.find((l) => l.productId === productId)?.unitPrice;

    const cartSubtotalForCategory = (category: string): number => {
      let total = 0;
      for (const l of lines) {
        const product = productMap.get(l.productId);
        if (product?.category === category) total += l.unitPrice * l.quantity;
      }
      return Math.round(total * 100) / 100;
    };

    let couponId: string | null = null;
    let couponDiscountAmount = 0;
    let couponFreeShipping = false;
    const couponCode = input.couponCode?.trim();
    if (couponCode) {
      const couponResult = await validateCoupon(couponCode, customerUserId, subtotal, {
        email: input.shipping.email,
        cartUnitPriceForProduct,
        cartSubtotalForCategory,
        tx,
      });
      if (!couponResult.ok) throw new Error(couponResult.message);
      couponId = couponResult.couponId;
      couponDiscountAmount = couponResult.discountAmount;
      couponFreeShipping = couponResult.freeShipping === true;
    }

    // Coupon and member discounts don't stack — take whichever is larger.
    const discountAmount = Math.max(memberDiscountAmount, couponDiscountAmount);
    if (couponId && couponDiscountAmount >= memberDiscountAmount) {
      discountPercent = subtotal > 0 ? Math.round((discountAmount / subtotal) * 10000) / 100 : 0;
    }

    const shippingCost = couponFreeShipping
      ? 0
      : computeCheckoutShippingCost(subtotal, input.shippingMethod, {
          discountAmount,
          paymentMethod: input.paymentMethod,
          region: input.shipping.region,
          city: input.shipping.city,
        });
    const total = computeMarketplaceOrderTotal(subtotal, discountAmount, shippingCost);

    let codPaymentRecord: ResolvedMarketplaceCodPayment | undefined;
    if (input.paymentMethod === "cash") {
      codPaymentRecord = await resolveMarketplaceCodPayment(input, total, currency);
    }

    if (input.paymongoPaymentIntentId) {
      const quote = await quoteMarketplaceCheckout(
        {
          items: input.items,
          shippingMethod: input.shippingMethod,
          shipping: input.shipping,
          paymentMethod: input.paymentMethod,
          couponCode: input.couponCode,
        },
        customerUserId,
        { tx }
      );
      if (quote.total !== total) {
        throw new Error("Order total changed. Refresh checkout and try again.");
      }
      const expectedMethod = input.paymentMethod === "gcash" ? "gcash" : "card";
      const verified = await verifyMarketplacePaymongoPayment({
        paymentIntentId: input.paymongoPaymentIntentId,
        expectedAmountCentavos: phpAmountToCentavos(total),
        expectedMethod,
      });
      paymongoRecord = {
        paymentIntentId: verified.paymentIntentId,
        paymentId: verified.paymentId,
        status: verified.status,
      };
      if (input.paymentMethod === "card") {
        cardPaymentRecord = {
          cardBrand: verified.cardBrand,
          cardLast4: verified.cardLast4,
          cardholderName: verified.cardholderName,
        };
      }
      if (input.paymentMethod === "gcash") {
        gcashPaymentRecord = {
          accountName: input.shipping.fullName,
          mobileLast4: "0000",
          mobileMasked: "GCash (PayMongo)",
        };
      }
    }

    const orderNumber = generateOrderNumber();
    const paidNow = input.paymongoPaymentIntentId
      ? true
      : isMarketplacePaymentCaptured(input.paymentMethod);
    const status = paidNow ? "paid" : marketplaceOrderStatusForPayment(input.paymentMethod);
    const amountPaid = paidNow ? total : 0;
    const change = Math.max(0, amountPaid - total);

    let orderNotes = input.notes?.trim() || `Marketplace web order — ${input.shipping.email}`;
    if (bankTransferPaymentRecord) {
      const refLine = `Bank transfer ref: ${bankTransferPaymentRecord.transferReference} → ${bankTransferPaymentRecord.depositToBankName}`;
      orderNotes = orderNotes.includes("Bank transfer ref:")
        ? orderNotes
        : `${orderNotes}\n${refLine}`;
    }
    if (codPaymentRecord) {
      let codLine = `COD — pay ${formatCurrency(codPaymentRecord.amountDue, currency)} on delivery`;
      if (codPaymentRecord.prepareChangeFor) {
        codLine += ` (customer pays with ${formatCurrency(codPaymentRecord.prepareChangeFor, currency)}`;
        if (codPaymentRecord.changeToReturn) {
          codLine += `, change ${formatCurrency(codPaymentRecord.changeToReturn, currency)}`;
        }
        codLine += ")";
      }
      orderNotes = orderNotes.includes("COD —") ? orderNotes : `${orderNotes}\n${codLine}`;
    }

    const paymentDetails: MarketplacePaymentDetails = {
      shipping: {
        fullName: input.shipping.fullName,
        email: input.shipping.email,
        phone: input.shipping.phone,
        line1: input.shipping.line1,
        line2: input.shipping.line2?.trim() || undefined,
        city: input.shipping.city,
        region: input.shipping.region,
        postalCode: input.shipping.postalCode,
        shippingMethod: input.shippingMethod,
        shippingCost,
      },
      cardPayment: cardPaymentRecord
        ? {
            savedMethodId: cardPaymentRecord.savedMethodId,
            cardBrand: cardPaymentRecord.cardBrand,
            cardLast4: cardPaymentRecord.cardLast4,
            cardholderName: cardPaymentRecord.cardholderName,
            expMonth: cardPaymentRecord.expMonth,
            expYear: cardPaymentRecord.expYear,
          }
        : undefined,
      gcashPayment: gcashPaymentRecord
        ? {
            savedMethodId: gcashPaymentRecord.savedMethodId,
            accountName: gcashPaymentRecord.accountName,
            mobileLast4: gcashPaymentRecord.mobileLast4,
            mobileMasked: gcashPaymentRecord.mobileMasked,
          }
        : undefined,
      bankTransferPayment: bankTransferPaymentRecord,
      codPayment: codPaymentRecord
        ? {
            amountDue: codPaymentRecord.amountDue,
            prepareChangeFor: codPaymentRecord.prepareChangeFor,
            changeToReturn: codPaymentRecord.changeToReturn,
            codAcknowledged: true,
          }
        : undefined,
      paymongo: paymongoRecord,
    };

    const order = await tx.order.create({
      data: {
        branchId,
        organizationId,
        orderNumber,
        type: "MARKETPLACE",
        status,
        memberId: null,
        memberName: input.shipping.fullName,
        cashierId,
        subtotal,
        discountAmount,
        discountPercent,
        couponCode: couponId ? couponCode?.toUpperCase() : undefined,
        couponId: couponId ?? undefined,
        shippingAmount: shippingCost,
        total,
        amountPaid,
        change,
        paymentMethod: input.paymentMethod,
        notes: orderNotes,
        paidAt: paidNow ? new Date() : null,
        paymentDetails: paymentDetails as unknown as Prisma.InputJsonValue,
        marketplaceCustomerUserId: customerUserId,
      },
    });

    if (couponId) {
      await redeemCoupon(couponId, customerUserId, order.id, tx, customerUserId ? undefined : input.shipping.email);
    }

    await tx.orderItem.createMany({
      data: lines.map((l) => ({
        orderId: order.id,
        branchId,
        organizationId,
        productId: l.productId,
        variantId: l.variantId,
        productName: l.name,
        variantName: l.variantName,
        sku: l.sku,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        cost: 0,
        total: l.unitPrice * l.quantity,
      })),
    });

    // Batch inventory deduction + stock movements
    for (const l of lines) {
      await tx.inventory.updateMany({
        where: { branchId, productId: l.productId, variantId: l.variantId },
        data: { quantity: { decrement: l.quantity } },
      });
    }

    await tx.stockMovement.createMany({
      data: lines.map((l) => {
        const invKey = `${l.productId}:${l.variantId ?? ""}`;
        const previousQty = invMap.get(invKey)?.quantity ?? 0;
        return {
          branchId,
          organizationId,
          productId: l.productId,
          variantId: l.variantId,
          type: "OUT" as const,
          quantity: l.quantity,
          previousQuantity: previousQty,
          newQuantity: previousQty - l.quantity,
          reference: orderNumber,
          orderId: order.id,
          performedBy: cashierId,
        };
      }),
    });

    if (paidNow) {
      await tx.transaction.create({
        data: {
          branchId,
          organizationId,
          orderId: order.id,
          memberId: null,
          type: "SALE",
          amount: total,
          paymentMethod: input.paymentMethod,
          reference: orderNumber,
          notes: "Marketplace",
          performedBy: cashierId,
        },
      });
    }

    return { order, orderNumber, total, status, subtotal, discountAmount, shippingCost };
  });

  const { order, orderNumber, total, status, subtotal, discountAmount, shippingCost } = result;

  if (
    customerUserId &&
    input.savePaymentMethod &&
    input.paymentMethod === "card" &&
    input.cardPayment &&
    !input.savedPaymentMethodId &&
    cardPaymentRecord
  ) {
    try {
      await addCustomerPaymentMethod(customerUserId, {
        type: "card",
        label: `${cardBrandLabel(cardPaymentRecord.cardBrand)} •••• ${cardPaymentRecord.cardLast4}`,
        last4: cardPaymentRecord.cardLast4,
        isDefault: false,
      });
    } catch {
      /* ignore save failure */
    }
  }

  if (
    customerUserId &&
    input.savePaymentMethod &&
    input.paymentMethod === "gcash" &&
    input.gcashPayment &&
    !input.savedPaymentMethodId &&
    gcashPaymentRecord
  ) {
    try {
      await addCustomerPaymentMethod(customerUserId, {
        type: "gcash",
        label: `GCash •••• ${gcashPaymentRecord.mobileLast4} (${gcashPaymentRecord.accountName})`,
        last4: gcashPaymentRecord.mobileLast4,
        isDefault: false,
      });
    } catch {
      /* ignore save failure */
    }
  }

  if (
    customerUserId &&
    input.savePaymentMethod &&
    input.paymentMethod === "bank_transfer" &&
    input.bankTransferPayment &&
    !input.savedPaymentMethodId &&
    bankTransferPaymentRecord?.accountLast4
  ) {
    try {
      await addCustomerPaymentMethod(customerUserId, {
        type: "bank_transfer",
        label: `${bankTransferPaymentRecord.depositorBank} •••• ${bankTransferPaymentRecord.accountLast4} (${bankTransferPaymentRecord.depositorName})`,
        last4: bankTransferPaymentRecord.accountLast4,
        isDefault: false,
      });
    } catch {
      /* ignore save failure */
    }
  }

  if (customerUserId && input.saveAddress) {
    try {
      await addCustomerSavedAddress(customerUserId, {
        label: "Checkout",
        fullName: input.shipping.fullName,
        phone: input.shipping.phone,
        line1: input.shipping.line1,
        line2: input.shipping.line2,
        city: input.shipping.city,
        region: input.shipping.region,
        postalCode: input.shipping.postalCode,
        isDefault: false,
      });
    } catch {
      /* ignore duplicate save */
    }
  }

  try {
    await markAbandonedCheckoutRecovered(input.shipping.email, order.id);
  } catch {
    /* best-effort; never block order placement */
  }

  return {
    orderId: order.id,
    orderNumber,
    total,
    status,
    subtotal,
    discountAmount,
    shippingCost,
  };
}

export type PublicMarketplaceReview = {
  id: string;
  productId: string;
  productName: string;
  productSlug?: string;
  rating: number;
  text: string;
  createdAt: string;
  reviewerName: string;
  images?: string[];
  featured?: boolean;
};

export type ListPublicReviewsOptions = {
  limit?: number;
  productId?: string;
  featuredOnly?: boolean;
};

export type ReviewAggregateStats = {
  averageRating: number | null;
  reviewCount: number;
  fiveStarCount: number;
};

export type ProductReviewSummary = {
  averageRating: number | null;
  reviewCount: number;
};

export type ListPublicReviewsResult = {
  reviews: PublicMarketplaceReview[];
  stats: ReviewAggregateStats;
};

export async function listPublicMarketplaceReviews(
  options: ListPublicReviewsOptions | number = 50
): Promise<ListPublicReviewsResult> {
  const opts: ListPublicReviewsOptions =
    typeof options === "number" ? { limit: options } : options;
  const { limit = 50, productId, featuredOnly } = opts;

  const cap = Math.min(100, Math.max(1, limit));

  const where: Prisma.UserReviewWhereInput = {};
  if (productId) where.productId = productId;
  if (featuredOnly) where.featured = true;

  const [reviews, statsRows] = await Promise.all([
    prisma.userReview.findMany({
      where,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: cap,
      include: { user: { select: { name: true } } },
    }),
    prisma.userReview.findMany({
      where: productId ? { productId } : {},
      select: { rating: true },
    }),
  ]);

  const reviewCount = statsRows.length;
  const sumRating = statsRows.reduce((s, r) => s + r.rating, 0);
  const fiveStarCount = statsRows.filter((r) => r.rating === 5).length;
  const averageRating = reviewCount > 0 ? Math.round((sumRating / reviewCount) * 10) / 10 : null;

  return {
    reviews: reviews.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.productName,
      productSlug: r.productSlug ?? undefined,
      rating: r.rating,
      text: r.text,
      createdAt: r.createdAt,
      reviewerName: r.user.name,
      images: r.images ?? [],
      featured: r.featured,
    })),
    stats: { averageRating, reviewCount, fiveStarCount },
  };
}

export async function getPublicReviewById(reviewId: string): Promise<PublicMarketplaceReview | null> {
  const r = await prisma.userReview.findUnique({
    where: { id: reviewId },
    include: { user: { select: { name: true } } },
  });
  if (!r) return null;

  return {
    id: r.id,
    productId: r.productId,
    productName: r.productName,
    productSlug: r.productSlug ?? undefined,
    rating: r.rating,
    text: r.text,
    createdAt: r.createdAt,
    reviewerName: r.user.name ?? "Customer",
    images: r.images ?? [],
    featured: r.featured,
  };
}

/** Per-product average rating and count from stored customer reviews. */
export async function getProductReviewSummaries(
  productIds: string[]
): Promise<Record<string, ProductReviewSummary>> {
  const unique = [...new Set(productIds.filter(Boolean))];
  const out: Record<string, ProductReviewSummary> = {};
  for (const id of unique) out[id] = { averageRating: null, reviewCount: 0 };
  if (!unique.length) return out;

  const rows = await prisma.userReview.groupBy({
    by: ["productId"],
    where: { productId: { in: unique } },
    _count: { _all: true },
    _sum: { rating: true },
  });

  for (const row of rows) {
    const count = row._count._all;
    const sum = row._sum.rating ?? 0;
    out[row.productId] = { averageRating: Math.round((sum / count) * 10) / 10, reviewCount: count };
  }
  return out;
}

export type AdminReview = {
  id: string;
  userId: string;
  reviewerName: string;
  reviewerEmail: string;
  productId: string;
  productName: string;
  productSlug?: string;
  rating: number;
  text: string;
  createdAt: string;
  images: string[];
  featured: boolean;
};

export async function listAdminReviews(filters: {
  page: number;
  limit: number;
  minRating: number;
  maxRating: number;
  productId?: string;
  search?: string;
}) {
  const { page, limit, minRating, maxRating, productId, search } = filters;

  const where: Prisma.UserReviewWhereInput = { rating: { gte: minRating, lte: maxRating } };
  if (productId) where.productId = productId;
  if (search) {
    where.OR = [
      { productName: { contains: search, mode: "insensitive" } },
      { user: { name: { contains: search, mode: "insensitive" } } },
      { text: { contains: search, mode: "insensitive" } },
    ];
  }

  const [statsRows, rows, total] = await Promise.all([
    prisma.userReview.findMany({ select: { rating: true } }),
    prisma.userReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.userReview.count({ where }),
  ]);

  const totalAll = statsRows.length;
  const sumRating = statsRows.reduce((s, r) => s + r.rating, 0);
  const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of statsRows) {
    if (r.rating >= 1 && r.rating <= 5) ratingCounts[r.rating as 1 | 2 | 3 | 4 | 5] += 1;
  }
  const averageRating = totalAll > 0 ? Math.round((sumRating / totalAll) * 10) / 10 : null;

  const data: AdminReview[] = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    reviewerName: r.user.name,
    reviewerEmail: r.user.email,
    productId: r.productId,
    productName: r.productName,
    productSlug: r.productSlug ?? undefined,
    rating: r.rating,
    text: r.text,
    createdAt: r.createdAt,
    images: r.images ?? [],
    featured: r.featured,
  }));

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    stats: {
      totalAll,
      averageRating,
      ratingCounts,
      negativeCount: ratingCounts[1] + ratingCounts[2] + ratingCounts[3],
    },
  };
}

/** Manually creates a review, attaching it to an existing customer or fabricating one for the given email. */
export async function createAdminReview(input: {
  reviewerName: string;
  reviewerEmail: string;
  productId: string;
  rating: number;
  text: string;
  featured?: boolean;
  images?: string[];
}) {
  const product = await prisma.product.findUnique({ where: { id: input.productId }, select: { name: true, slug: true } });
  if (!product) throw new Error("Product not found");

  const email = input.reviewerEmail.trim().toLowerCase();
  let user = await prisma.user.findFirst({ where: { email, deletedAt: null } });

  if (!user) {
    // Use bcrypt (not a raw insert) so this fabricated account still has a schema-valid
    // password hash — otherwise it would permanently block the real owner of this email
    // from ever registering (registration only checks for an existing user with that email).
    const bcrypt = (await import("bcryptjs")).default;
    const { randomBytes } = await import("crypto");
    const unusablePassword = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
    user = await prisma.user.create({
      data: {
        name: input.reviewerName.trim(),
        email,
        password: unusablePassword,
        role: "CUSTOMER",
        isActive: true,
        emailVerified: true,
      },
    });
  }

  const reviewId = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await prisma.userReview.create({
    data: {
      id: reviewId,
      userId: user.id,
      productId: input.productId,
      productName: product.name,
      productSlug: product.slug,
      rating: input.rating,
      text: input.text.trim(),
      createdAt: new Date().toISOString(),
      images: Array.isArray(input.images) ? input.images.filter(Boolean) : [],
      featured: input.featured ?? false,
    },
  });

  return reviewId;
}

/** Updates a review's featured flag (and optionally its images). Returns false if not found. */
export async function setAdminReviewFeatured(
  reviewId: string,
  featured: boolean,
  images?: string[]
): Promise<boolean> {
  const result = await prisma.userReview.updateMany({
    where: { id: reviewId },
    data: { featured, ...(Array.isArray(images) ? { images } : {}) },
  });
  return result.count > 0;
}

/** Bulk delete reviews by {userId, reviewId} pairs (userId kept in the signature for API compatibility). */
export async function deleteAdminReviews(items: { userId: string; reviewId: string }[]): Promise<number> {
  const reviewIds = items.map((i) => i.reviewId).filter(Boolean);
  if (reviewIds.length === 0) return 0;
  const result = await prisma.userReview.deleteMany({ where: { id: { in: reviewIds } } });
  return result.count;
}

const DEMO_REVIEWER_POOL = [
  { name: "Maria Santos", email: "maria.s@generated.glowish.demo" },
  { name: "Juan Reyes", email: "juan.r@generated.glowish.demo" },
  { name: "Rosa Cruz", email: "rosa.c@generated.glowish.demo" },
  { name: "Pedro Dela Cruz", email: "pedro.d@generated.glowish.demo" },
  { name: "Ana Gonzalez", email: "ana.g@generated.glowish.demo" },
  { name: "Miguel Torres", email: "miguel.t@generated.glowish.demo" },
  { name: "Elena Ramos", email: "elena.r@generated.glowish.demo" },
  { name: "Carlos Garcia", email: "carlos.g@generated.glowish.demo" },
  { name: "Luz Mendoza", email: "luz.m@generated.glowish.demo" },
  { name: "Jose Villanueva", email: "jose.v@generated.glowish.demo" },
  { name: "Carla Flores", email: "carla.f@generated.glowish.demo" },
  { name: "Ramon Aquino", email: "ramon.a@generated.glowish.demo" },
  { name: "Sofia Lim", email: "sofia.l@generated.glowish.demo" },
  { name: "Antonio Bautista", email: "antonio.b@generated.glowish.demo" },
  { name: "Teresa Navarro", email: "teresa.n@generated.glowish.demo" },
];

type DemoReviewCategory = "homecare" | "cosmetics" | "wellness" | "scent";

const DEMO_REVIEW_TEMPLATES: Record<DemoReviewCategory, Record<3 | 4 | 5, string[]>> = {
  homecare: {
    5: [
      "Absolutely love this! My skin has never felt softer. Will definitely keep buying.",
      "Best homecare product I've ever used. The scent is wonderful and lasts all day.",
      "Works amazingly well. I've recommended it to all my family members already.",
      "Great quality and very effective. Skin feels clean and moisturized every use.",
    ],
    4: [
      "Good product, does exactly what it promises. Will buy again for sure.",
      "Solid quality with a nice scent. A little pricey but worth it for the results.",
      "Happy with this purchase. Works well and packaging is neat.",
      "Good value for money. My skin feels noticeably cleaner after every use.",
    ],
    3: [
      "It's okay. Nothing extraordinary but gets the job done for daily use.",
      "Average product. Works fine but I expected a bit more for the price.",
      "Decent enough. Does what it says, though I've used better products before.",
      "Not bad. The scent is mild but the product itself is functional.",
    ],
  },
  cosmetics: {
    5: [
      "This has completely transformed my skin! I get compliments every single day now.",
      "Absolutely amazing product. Results are visible within just a few days.",
      "Best cosmetics purchase I've made this year. The formula is absolutely perfect.",
      "My skin looks so much better since I started using this. Highly recommend!",
    ],
    4: [
      "Great product overall. Exactly as described and the results are clearly visible.",
      "Good quality and nice packaging. Would definitely recommend to friends.",
      "Works well and feels great on the skin. Really happy with this purchase.",
      "Quality product. The formula is smooth and blends beautifully.",
    ],
    3: [
      "Decent product. Does what it claims but results are still subtle so far.",
      "It works, I just expected more noticeable results for the price.",
      "Okay product. Giving it more time before making a final judgment.",
      "Not bad but not my favorite either. Might try a different shade next time.",
    ],
  },
  wellness: {
    5: [
      "I've noticed a real difference in my energy and overall wellbeing. Amazing!",
      "Excellent supplement. Results are noticeable after just two weeks of use.",
      "This has become part of my daily routine. I feel so much better already.",
      "Great product. Easy to take and the benefits are real and noticeable.",
    ],
    4: [
      "Good supplement. Takes some time but it does work. Will continue using it.",
      "Quality product with good ingredients. I feel a difference after a month.",
      "Happy with this. Does what it says and the taste is manageable.",
      "Solid wellness product. Already reordered and plan to continue long-term.",
    ],
    3: [
      "Too early to judge but the product itself seems good quality. Will update.",
      "Alright product. The taste is a bit strong but I'm slowly getting used to it.",
      "Seems decent. Waiting another few weeks before drawing conclusions.",
      "Okay for now. Not sure if it's working yet but I'll keep taking it.",
    ],
  },
  scent: {
    5: [
      "This is now my signature scent! Long-lasting and I get compliments everywhere.",
      "Absolutely stunning fragrance. Worth every peso. Already buying my second bottle!",
      "The scent is divine and stays on all day. Exactly what I was looking for.",
      "Beautiful fragrance that gets better as the day goes on. Total love!",
    ],
    4: [
      "Lovely scent that lasts for several hours. Great choice for daily wear.",
      "Nice fragrance and elegant bottle design. Good longevity on the skin.",
      "Beautiful scent. Stays on for most of the day. Will definitely rebuy.",
      "Good fragrance at a reasonable price. Happy with the overall purchase.",
    ],
    3: [
      "Decent scent but fades a bit faster than expected. Still enjoyable though.",
      "The fragrance is pleasant but slightly different from what I imagined.",
      "Nice enough scent, could last longer. Good for casual everyday wear.",
      "Okay perfume. Not my favorite but wearable for daily use.",
    ],
  },
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Idempotently (re)generates demo reviews across marketplace products for demo/seed purposes. */
export async function generateDemoReviews(): Promise<{ generated: number; products: number }> {
  const products = await prisma.product.findMany({
    where: { marketplaceListed: true, isActive: true, deletedAt: null },
    select: { id: true, name: true, slug: true, category: true },
  });
  if (products.length === 0) throw new Error("No marketplace products found");

  const reviewerMap = new Map<
    string,
    { name: string; email: string; reviews: Omit<Prisma.UserReviewCreateManyInput, "userId">[] }
  >();
  for (const r of DEMO_REVIEWER_POOL) reviewerMap.set(r.email, { ...r, reviews: [] });

  let totalGenerated = 0;

  for (const product of products) {
    const count = Math.floor(Math.random() * 10) + 1; // 1–10 per product
    const reviewers = shuffleArray(DEMO_REVIEWER_POOL).slice(0, Math.min(count, DEMO_REVIEWER_POOL.length));
    const cat = (product.category as DemoReviewCategory) ?? "homecare";
    const templates = DEMO_REVIEW_TEMPLATES[cat] ?? DEMO_REVIEW_TEMPLATES.homecare;

    for (const reviewer of reviewers) {
      const rating = (Math.floor(Math.random() * 3) + 3) as 3 | 4 | 5;
      reviewerMap.get(reviewer.email)!.reviews.push({
        id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        productId: product.id,
        productName: product.name,
        productSlug: product.slug ?? "",
        rating,
        text: pickRandom(templates[rating]),
        createdAt: new Date(Date.now() - (Math.floor(Math.random() * 90) + 1) * 86400000).toISOString(),
      });
      totalGenerated++;
    }
  }

  const docs = Array.from(reviewerMap.values()).filter((r) => r.reviews.length > 0);

  await prisma.$transaction(async (tx) => {
    // Replace previously generated reviewers so this action is idempotent.
    await tx.user.deleteMany({ where: { email: { endsWith: "@generated.glowish.demo" } } });

    if (docs.length === 0) return;

    const bcrypt = (await import("bcryptjs")).default;
    const { randomBytes } = await import("crypto");
    const unusablePassword = await bcrypt.hash(randomBytes(32).toString("hex"), 12);

    for (const r of docs) {
      const user = await tx.user.create({
        data: { name: r.name, email: r.email, password: unusablePassword, role: "CUSTOMER", isActive: true, emailVerified: true },
      });
      await tx.userReview.createMany({ data: r.reviews.map((rev) => ({ ...rev, userId: user.id })) });
    }
  });

  return { generated: totalGenerated, products: products.length };
}

export async function submitMarketplaceContactMessage(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  await prisma.marketplaceContactMessage.create({
    data: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      subject: input.subject.trim(),
      message: input.message.trim(),
    },
  });
  return { ok: true };
}
