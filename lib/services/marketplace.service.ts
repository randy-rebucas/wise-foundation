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
import { addCustomerSavedAddress } from "@/lib/services/customerAccountData.service";
import {
  computeCheckoutShippingCost,
  computeMarketplaceOrderTotal,
  isMarketplacePaymentCaptured,
  marketplaceOrderStatusForPayment,
} from "@/lib/utils/marketplaceShipping";

const listedFilter: Record<string, unknown> = {
  deletedAt: null,
  isActive: true,
  $or: [{ marketplaceListed: true }, { marketplaceListed: { $exists: false } }],
};

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
      .select("name slug images retailPrice category sku description")
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
    description: product.description,
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
    const shippingCost = computeCheckoutShippingCost(subtotal, input.shippingMethod);

    let discountPercent = 0;
    if (opts?.customerUserId) {
      const dashboard = await getCustomerDashboard(opts.customerUserId);
      if (dashboard) {
        discountPercent = dashboard.memberDiscountPercent;
      }
    }
    const discountAmount =
      discountPercent > 0
        ? Math.round((subtotal * Math.min(100, discountPercent)) / 100 * 100) / 100
        : 0;
    const total = computeMarketplaceOrderTotal(subtotal, discountAmount, shippingCost);
    const orderNumber = generateOrderNumber();
    const status = marketplaceOrderStatusForPayment(input.paymentMethod);
    const paidNow = isMarketplacePaymentCaptured(input.paymentMethod);
    const amountPaid = paidNow ? total : 0;
    const change = Math.max(0, amountPaid - total);

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
          notes: input.notes?.trim() || `Marketplace web order — ${input.shipping.email}`,
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

    if (opts?.customerUserId && input.saveAddress) {
      try {
        await addCustomerSavedAddress(opts.customerUserId, {
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
