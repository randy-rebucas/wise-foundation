import mongoose from "mongoose";
import type { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppSettings } from "@/lib/db/models/AppSettings";
import { Branch } from "@/lib/db/models/Branch";
import { Inventory } from "@/lib/db/models/Inventory";
import { Order } from "@/lib/db/models/Order";
import { OrderItem } from "@/lib/db/models/OrderItem";
import { Product } from "@/lib/db/models/Product";
import { ProductVariant } from "@/lib/db/models/ProductVariant";
import { StockMovement } from "@/lib/db/models/StockMovement";
import { Transaction } from "@/lib/db/models/Transaction";
import { User } from "@/lib/db/models/User";
import { MarketplaceContactMessage } from "@/lib/db/models/MarketplaceContactMessage";
import { generateOrderNumber } from "@/lib/utils";
import type { MarketplaceCheckoutInput } from "@/lib/validations/marketplace.schema";
import type { ProductCategory } from "@/types";
import { getCustomerDashboard } from "@/lib/services/customerDashboard.service";
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
  amountDue: number
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
  });

  if (!validated.ok) throw new Error(validated.error);
  return validated.resolved;
}

const listedFilter: Record<string, unknown> = {
  deletedAt: null,
  isActive: true,
  $or: [{ marketplaceListed: true }, { marketplaceListed: { $exists: false } }],
};

export async function listMarketplaceProductSlugs(): Promise<
  { slug: string; updatedAt?: Date }[]
> {
  await connectDB();
  const rows = await Product.find(listedFilter)
    .select("slug updatedAt")
    .sort({ updatedAt: -1 })
    .lean();
  return rows.map((row) => ({
    slug: row.slug,
    updatedAt: row.updatedAt,
  }));
}

export async function getMarketplaceFulfillmentContext(): Promise<{
  branchId: Types.ObjectId;
  organizationId: Types.ObjectId | null;
}> {
  await connectDB();
  const settings = await AppSettings.findOne().sort({ _id: 1 }).lean();
  let branchId = settings?.marketplaceFulfillmentBranchId;
  if (!branchId) {
    const hq = await Branch.findOne({ isHeadOffice: true, deletedAt: null, isActive: true }).lean();
    const fallback =
      hq ?? (await Branch.findOne({ deletedAt: null, isActive: true }).sort({ _id: 1 }).lean());
    if (!fallback) {
      throw new Error(
        "No branch is available to fulfill online orders. Create a branch in Admin first."
      );
    }
    branchId = fallback._id as Types.ObjectId;
  }
  const branch = await Branch.findById(branchId).lean();
  if (!branch) throw new Error("Fulfillment branch not found");
  return {
    branchId: branch._id as Types.ObjectId,
    organizationId: (branch.organizationId as Types.ObjectId | null | undefined) ?? null,
  };
}

export async function resolveMarketplaceCashierId(): Promise<Types.ObjectId> {
  await connectDB();
  const admin = await User.findOne({ role: "ADMIN", deletedAt: null, isActive: true })
    .sort({ _id: 1 })
    .lean();
  if (!admin?._id) throw new Error("No administrator account found for marketplace orders");
  return admin._id as Types.ObjectId;
}

export async function listMarketplaceProducts(params: {
  page?: number;
  limit?: number;
  search?: string;
  category?: ProductCategory | "";
}) {
  await connectDB();
  const { branchId } = await getMarketplaceFulfillmentContext();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(48, Math.max(1, params.limit ?? 12));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { ...listedFilter };
  if (params.category) filter.category = params.category;
  const q = params.search?.trim();
  if (q) {
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(esc, "i");
    filter.$or = [{ name: rx }, { sku: rx }, { tags: rx }];
  }

  const sort = { createdAt: -1 } as const;

  const [rows, total] = await Promise.all([
    Product.find(filter)
      .select(
        "name slug images retailPrice category sku shortDescription description seoTitle seoDescription"
      )
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  const ids = rows.map((r) => r._id);
  const inv =
    ids.length === 0
      ? []
      : await Inventory.find({ branchId, productId: { $in: ids } }).lean();
  const stockByProduct = new Map<string, number>();
  for (const row of inv) {
    const pid = row.productId.toString();
    stockByProduct.set(pid, (stockByProduct.get(pid) ?? 0) + row.quantity);
  }

  return {
    data: rows.map((p) => ({
      _id: p._id.toString(),
      name: p.name,
      slug: p.slug,
      images: p.images ?? [],
      retailPrice: p.retailPrice,
      category: p.category,
      sku: p.sku,
      shortDescription: p.shortDescription,
      description: p.description,
      stock: stockByProduct.get(p._id.toString()) ?? 0,
    })),
    meta: { page, limit, total, hasMore: skip + rows.length < total },
  };
}

export async function getMarketplaceProductBySlug(slug: string) {
  await connectDB();
  const { branchId } = await getMarketplaceFulfillmentContext();
  const product = await Product.findOne({
    slug: slug.toLowerCase().trim(),
    ...listedFilter,
  }).lean();
  if (!product) return null;

  const variants = await ProductVariant.find({
    productId: product._id,
    deletedAt: null,
    isActive: true,
  })
    .sort({ name: 1 })
    .lean();

  const inv = await Inventory.find({ branchId, productId: product._id }).lean();
  const qtyKey = (productId: string, variantId: string | null) => `${productId}:${variantId ?? ""}`;
  const qtyMap = new Map<string, number>();
  for (const row of inv) {
    const k = qtyKey(row.productId.toString(), row.variantId?.toString() ?? null);
    qtyMap.set(k, (qtyMap.get(k) ?? 0) + row.quantity);
  }

  const baseKey = qtyKey(product._id.toString(), null);
  const baseStock = qtyMap.get(baseKey) ?? 0;

  const variantRows = variants.map((v) => ({
    _id: v._id.toString(),
    name: v.name,
    sku: v.sku,
    retailPrice: v.retailPrice,
    images: v.images ?? [],
    stock: qtyMap.get(qtyKey(product._id.toString(), v._id.toString())) ?? 0,
  }));

  return {
    _id: product._id.toString(),
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    description: product.description,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    category: product.category,
    sku: product.sku,
    images: product.images ?? [],
    retailPrice: product.retailPrice,
    baseStock,
    variants: variantRows,
    hasVariants: variantRows.length > 0,
  };
}

export async function placeMarketplaceOrder(
  input: MarketplaceCheckoutInput,
  opts?: { customerUserId?: string | null }
) {
  await connectDB();
  const customerUserId = opts?.customerUserId ?? null;

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

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    type Line = {
      productId: Types.ObjectId;
      variantId: Types.ObjectId | null;
      name: string;
      variantName?: string;
      sku: string;
      quantity: number;
      unitPrice: number;
    };

    const lines: Line[] = [];

    for (const raw of input.items) {
      const product = await Product.findOne({
        _id: raw.productId,
        ...listedFilter,
      })
        .session(session)
        .lean();
      if (!product) throw new Error(`Product not available: ${raw.productId}`);

      let unitPrice = product.retailPrice;
      let sku = product.sku;
      const name = product.name;
      let variantName: string | undefined;
      let variantId: Types.ObjectId | null = null;
      let invFilter: { branchId: Types.ObjectId; productId: Types.ObjectId; variantId?: Types.ObjectId | null };

      if (raw.variantId) {
        const v = await ProductVariant.findOne({
          _id: raw.variantId,
          productId: product._id,
          deletedAt: null,
          isActive: true,
        })
          .session(session)
          .lean();
        if (!v) throw new Error(`Invalid variant for product ${product.name}`);
        unitPrice = v.retailPrice;
        sku = v.sku;
        variantName = v.name;
        variantId = v._id as Types.ObjectId;
        invFilter = { branchId, productId: product._id as Types.ObjectId, variantId: v._id };
      } else {
        const variantCount = await ProductVariant.countDocuments({
          productId: product._id,
          deletedAt: null,
          isActive: true,
        }).session(session);
        if (variantCount > 0) {
          throw new Error(`Please choose a variant for ${product.name}`);
        }
        invFilter = { branchId, productId: product._id as Types.ObjectId, variantId: null };
      }

      const inv = await Inventory.findOne(invFilter).session(session);
      if (!inv || inv.quantity < raw.quantity) {
        throw new Error(`Insufficient stock for ${name}${variantName ? ` (${variantName})` : ""}`);
      }

      lines.push({
        productId: product._id as Types.ObjectId,
        variantId,
        name,
        variantName,
        sku,
        quantity: raw.quantity,
        unitPrice,
      });
    }

    const subtotal = Math.round(
      lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0) * 100
    ) / 100;
    let discountPercent = 0;
    if (customerUserId) {
      const dashboard = await getCustomerDashboard(customerUserId);
      if (dashboard) {
        discountPercent = dashboard.memberDiscountPercent;
      }
    }
    const discountAmount =
      discountPercent > 0
        ? Math.round((subtotal * Math.min(100, discountPercent)) / 100 * 100) / 100
        : 0;

    const shippingCost = computeCheckoutShippingCost(subtotal, input.shippingMethod, {
      discountAmount,
      paymentMethod: input.paymentMethod,
      region: input.shipping.region,
      city: input.shipping.city,
    });
    const total = computeMarketplaceOrderTotal(subtotal, discountAmount, shippingCost);

    let codPaymentRecord: ResolvedMarketplaceCodPayment | undefined;
    if (input.paymentMethod === "cash") {
      codPaymentRecord = await resolveMarketplaceCodPayment(input, total);
    }

    if (input.paymongoPaymentIntentId) {
      const quote = await quoteMarketplaceCheckout(
        {
          items: input.items,
          shippingMethod: input.shippingMethod,
          shipping: input.shipping,
          paymentMethod: input.paymentMethod,
        },
        customerUserId
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
      let codLine = `COD — pay ₱${codPaymentRecord.amountDue.toFixed(2)} on delivery`;
      if (codPaymentRecord.prepareChangeFor) {
        codLine += ` (customer pays with ₱${codPaymentRecord.prepareChangeFor.toFixed(2)}`;
        if (codPaymentRecord.changeToReturn) {
          codLine += `, change ₱${codPaymentRecord.changeToReturn.toFixed(2)}`;
        }
        codLine += ")";
      }
      orderNotes = orderNotes.includes("COD —")
        ? orderNotes
        : `${orderNotes}\n${codLine}`;
    }

    const customerOid =
      opts?.customerUserId && mongoose.isValidObjectId(opts.customerUserId)
        ? new mongoose.Types.ObjectId(opts.customerUserId)
        : null;

    const [order] = await Order.create(
      [
        {
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
          shippingAmount: shippingCost,
          total,
          amountPaid,
          change,
          paymentMethod: input.paymentMethod,
          notes: orderNotes,
          paidAt: paidNow ? new Date() : null,
          marketplaceShipping: {
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
          marketplaceCardPayment: cardPaymentRecord
            ? {
                savedMethodId: cardPaymentRecord.savedMethodId,
                cardBrand: cardPaymentRecord.cardBrand,
                cardLast4: cardPaymentRecord.cardLast4,
                cardholderName: cardPaymentRecord.cardholderName,
                expMonth: cardPaymentRecord.expMonth,
                expYear: cardPaymentRecord.expYear,
              }
            : undefined,
          marketplaceGcashPayment: gcashPaymentRecord
            ? {
                savedMethodId: gcashPaymentRecord.savedMethodId,
                accountName: gcashPaymentRecord.accountName,
                mobileLast4: gcashPaymentRecord.mobileLast4,
                mobileMasked: gcashPaymentRecord.mobileMasked,
              }
            : undefined,
          marketplaceBankTransferPayment: bankTransferPaymentRecord
            ? {
                savedMethodId: bankTransferPaymentRecord.savedMethodId,
                depositorName: bankTransferPaymentRecord.depositorName,
                depositorBank: bankTransferPaymentRecord.depositorBank,
                accountLast4: bankTransferPaymentRecord.accountLast4,
                transferReference: bankTransferPaymentRecord.transferReference,
                depositToBankId: bankTransferPaymentRecord.depositToBankId,
                depositToBankName: bankTransferPaymentRecord.depositToBankName,
                depositToAccountName: bankTransferPaymentRecord.depositToAccountName,
                depositToAccountNumber: bankTransferPaymentRecord.depositToAccountNumber,
              }
            : undefined,
          marketplaceCodPayment: codPaymentRecord
            ? {
                amountDue: codPaymentRecord.amountDue,
                prepareChangeFor: codPaymentRecord.prepareChangeFor,
                changeToReturn: codPaymentRecord.changeToReturn,
                codAcknowledged: true,
              }
            : undefined,
          marketplacePaymongo: paymongoRecord,
          marketplaceCustomerUserId: customerOid,
        },
      ],
      { session }
    );

    const orderItems = lines.map((l) => ({
      orderId: order._id,
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
    }));

    await OrderItem.insertMany(orderItems, { session });

    for (const l of lines) {
      const invFilter = {
        branchId,
        productId: l.productId,
        variantId: l.variantId ?? null,
      };
      const inventoryRecord = await Inventory.findOne(invFilter).session(session);
      if (!inventoryRecord) throw new Error("Inventory row missing");
      const previousQty = inventoryRecord.quantity;
      inventoryRecord.quantity -= l.quantity;
      await inventoryRecord.save({ session });

      await StockMovement.create(
        [
          {
            branchId,
            organizationId,
            productId: l.productId,
            variantId: l.variantId ?? null,
            type: "OUT",
            quantity: l.quantity,
            previousQuantity: previousQty,
            newQuantity: inventoryRecord.quantity,
            reference: orderNumber,
            orderId: order._id,
            performedBy: cashierId,
          },
        ],
        { session }
      );
    }

    if (paidNow) {
      await Transaction.create(
        [
          {
            branchId,
            organizationId,
            orderId: order._id,
            memberId: null,
            type: "SALE",
            amount: total,
            paymentMethod: input.paymentMethod,
            reference: orderNumber,
            notes: "Marketplace",
            performedBy: cashierId,
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();

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

    return {
      orderId: order._id.toString(),
      orderNumber,
      total,
      status,
      subtotal,
      discountAmount,
      shippingCost,
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
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
};

export async function listPublicMarketplaceReviews(limit = 50) {
  await connectDB();
  const cap = Math.min(100, Math.max(1, limit));
  const users = await User.find({
    role: "CUSTOMER",
    deletedAt: null,
    "marketplace.reviews.0": { $exists: true },
  })
    .select("name marketplace.reviews")
    .lean();

  const flat: PublicMarketplaceReview[] = [];
  for (const user of users) {
    const reviews = user.marketplace?.reviews ?? [];
    for (const r of reviews) {
      flat.push({
        id: r.id,
        productId: r.productId,
        productName: r.productName,
        productSlug: r.productSlug,
        rating: r.rating,
        text: r.text,
        createdAt: r.createdAt,
        reviewerName: user.name?.split(" ")[0] ?? "Customer",
      });
    }
  }

  flat.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return flat.slice(0, cap);
}

export async function submitMarketplaceContactMessage(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  await connectDB();
  await MarketplaceContactMessage.create({
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    subject: input.subject.trim(),
    message: input.message.trim(),
  });
  return { ok: true };
}
