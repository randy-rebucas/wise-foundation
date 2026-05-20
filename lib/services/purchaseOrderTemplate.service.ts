import { connectDB } from "@/lib/db/connect";
import { Product } from "@/lib/db/models/Product";
import { ProductVariant } from "@/lib/db/models/ProductVariant";
import { defaultProcurementUnitCost } from "@/lib/utils/procurementCost";

export interface PurchaseOrderCatalogTemplateLine {
  productId: string;
  productName: string;
  baseProductName: string;
  sku: string;
  variantId?: string;
  variants?: {
    _id: string;
    name: string;
    sku: string;
    retailPrice: number;
    isActive?: boolean;
  }[];
  quantity: number;
  unitCost: number;
}

export interface PurchaseOrderCatalogTemplate {
  title: string;
  lineCount: number;
  items: PurchaseOrderCatalogTemplateLine[];
}

/** One line per active product, or per active variant when the product has variants. */
export async function getPurchaseOrderCatalogTemplate(): Promise<PurchaseOrderCatalogTemplate> {
  await connectDB();

  const products = await Product.find({ deletedAt: null, isActive: true })
    .sort({ name: 1 })
    .lean();

  if (products.length === 0) {
    return {
      title: "Full catalog order",
      lineCount: 0,
      items: [],
    };
  }

  const productIds = products.map((p) => p._id);
  const variantDocs = await ProductVariant.find({
    productId: { $in: productIds },
    deletedAt: null,
    isActive: true,
  })
    .sort({ name: 1 })
    .lean();

  const variantsByProductId = new Map<
    string,
    { _id: string; name: string; sku: string; retailPrice: number; isActive?: boolean }[]
  >();

  for (const v of variantDocs) {
    const pid = String(v.productId);
    const list = variantsByProductId.get(pid) ?? [];
    list.push({
      _id: String(v._id),
      name: v.name,
      sku: v.sku,
      retailPrice: v.retailPrice,
      isActive: v.isActive,
    });
    variantsByProductId.set(pid, list);
  }

  const items: PurchaseOrderCatalogTemplateLine[] = [];

  for (const product of products) {
    const productId = String(product._id);
    const variants = variantsByProductId.get(productId) ?? [];

    if (variants.length > 0) {
      for (const variant of variants) {
        items.push({
          productId,
          baseProductName: product.name,
          productName: `${product.name} — ${variant.name}`,
          sku: variant.sku,
          variantId: variant._id,
          variants,
          quantity: 1,
          unitCost: defaultProcurementUnitCost(variant.retailPrice),
        });
      }
    } else {
      items.push({
        productId,
        baseProductName: product.name,
        productName: product.name,
        sku: product.sku,
        quantity: 1,
        unitCost: defaultProcurementUnitCost(product.retailPrice),
      });
    }
  }

  return {
    title: "Full catalog order",
    lineCount: items.length,
    items,
  };
}
