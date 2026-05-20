import type { Types } from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { Inventory } from "@/lib/db/models/Inventory";
import { Product } from "@/lib/db/models/Product";
import { ProductVariant } from "@/lib/db/models/ProductVariant";
import { getCustomerDashboard } from "@/lib/services/customerDashboard.service";
import { AppSettings } from "@/lib/db/models/AppSettings";
import { Branch } from "@/lib/db/models/Branch";
import type { MarketplaceCheckoutInput } from "@/lib/validations/marketplace.schema";
import { phpAmountToCentavos } from "@/lib/paymongo/config";
import {
  computeCheckoutShippingCost,
  computeMarketplaceOrderTotal,
} from "@/lib/utils/marketplaceShipping";

const listedFilter: Record<string, unknown> = {
  deletedAt: null,
  isActive: true,
  $or: [{ marketplaceListed: true }, { marketplaceListed: { $exists: false } }],
};

export type MarketplaceCheckoutQuote = {
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  shippingCost: number;
  total: number;
  amountCentavos: number;
};

/** Validates cart lines and stock; returns pricing for checkout / PayMongo intent. */
export async function quoteMarketplaceCheckout(
  input: Pick<MarketplaceCheckoutInput, "items" | "shippingMethod">,
  customerUserId: string | null
): Promise<MarketplaceCheckoutQuote> {
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

  for (const raw of input.items) {
    const product = await Product.findOne({
      _id: raw.productId,
      ...listedFilter,
    }).lean();
    if (!product) throw new Error(`Product not available: ${raw.productId}`);

    let name = product.name;
    let variantName: string | undefined;
    let invFilter: {
      branchId: Types.ObjectId;
      productId: Types.ObjectId;
      variantId?: Types.ObjectId | null;
    };

    if (raw.variantId) {
      const v = await ProductVariant.findOne({
        _id: raw.variantId,
        productId: product._id,
        deletedAt: null,
        isActive: true,
      }).lean();
      if (!v) throw new Error(`Invalid variant for product ${product.name}`);
      variantName = v.name;
      invFilter = { branchId, productId: product._id as Types.ObjectId, variantId: v._id };
    } else {
      const variantCount = await ProductVariant.countDocuments({
        productId: product._id,
        deletedAt: null,
        isActive: true,
      });
      if (variantCount > 0) {
        throw new Error(`Please choose a variant for ${product.name}`);
      }
      invFilter = { branchId, productId: product._id as Types.ObjectId, variantId: null };
    }

    const inv = await Inventory.findOne({ ...invFilter, branchId }).lean();
    if (!inv || inv.quantity < raw.quantity) {
      throw new Error(`Insufficient stock for ${name}${variantName ? ` (${variantName})` : ""}`);
    }
  }

  const products = await Product.find({
    _id: { $in: input.items.map((i) => i.productId) },
    ...listedFilter,
  }).lean();

  const variantIds = input.items.filter((i) => i.variantId).map((i) => i.variantId!);
  const variants =
    variantIds.length > 0
      ? await ProductVariant.find({ _id: { $in: variantIds }, deletedAt: null }).lean()
      : [];

  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const variantMap = new Map(variants.map((v) => [String(v._id), v]));

  let subtotal = 0;
  for (const raw of input.items) {
    const product = productMap.get(raw.productId);
    if (!product) continue;
    let unitPrice = product.retailPrice;
    if (raw.variantId) {
      const v = variantMap.get(raw.variantId);
      if (v) unitPrice = v.retailPrice;
    }
    subtotal += unitPrice * raw.quantity;
  }
  subtotal = Math.round(subtotal * 100) / 100;

  const shippingCost = computeCheckoutShippingCost(subtotal, input.shippingMethod);

  let discountPercent = 0;
  if (customerUserId) {
    const dashboard = await getCustomerDashboard(customerUserId);
    if (dashboard) discountPercent = dashboard.memberDiscountPercent;
  }
  const discountAmount =
    discountPercent > 0
      ? Math.round((subtotal * Math.min(100, discountPercent)) / 100 * 100) / 100
      : 0;
  const total = computeMarketplaceOrderTotal(subtotal, discountAmount, shippingCost);

  return {
    subtotal,
    discountAmount,
    discountPercent,
    shippingCost,
    total,
    amountCentavos: phpAmountToCentavos(total),
  };
}
