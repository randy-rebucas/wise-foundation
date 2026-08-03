import { prisma } from "@/lib/db/prisma";
import { defaultProcurementUnitCost } from "@/lib/utils/procurementCost";

export const CATALOG_TEMPLATE_PAGE_SIZE = 100;
export const CATALOG_TEMPLATE_MAX_PAGES = 500;

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
  page?: number;
  limit?: number;
  totalProducts?: number;
  hasMore?: boolean;
}

function buildLinesForProducts(
  products: { id: string; name: string; sku: string; retailPrice: number }[],
  variantsByProductId: Map<
    string,
    { _id: string; name: string; sku: string; retailPrice: number; isActive?: boolean }[]
  >
): PurchaseOrderCatalogTemplateLine[] {
  const items: PurchaseOrderCatalogTemplateLine[] = [];

  for (const product of products) {
    const variants = variantsByProductId.get(product.id) ?? [];

    if (variants.length > 0) {
      for (const variant of variants) {
        items.push({
          productId: product.id,
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
        productId: product.id,
        baseProductName: product.name,
        productName: product.name,
        sku: product.sku,
        quantity: 1,
        unitCost: defaultProcurementUnitCost(product.retailPrice),
      });
    }
  }

  return items;
}

async function loadVariantsByProductIds(
  productIds: string[]
): Promise<
  Map<string, { _id: string; name: string; sku: string; retailPrice: number; isActive?: boolean }[]>
> {
  if (productIds.length === 0) {
    return new Map();
  }

  const variantDocs = await prisma.productVariant.findMany({
    where: { productId: { in: productIds }, deletedAt: null, isActive: true },
    orderBy: { name: "asc" },
  });

  const variantsByProductId = new Map<
    string,
    { _id: string; name: string; sku: string; retailPrice: number; isActive?: boolean }[]
  >();

  for (const v of variantDocs) {
    const list = variantsByProductId.get(v.productId) ?? [];
    list.push({ _id: v.id, name: v.name, sku: v.sku, retailPrice: v.retailPrice, isActive: v.isActive });
    variantsByProductId.set(v.productId, list);
  }

  return variantsByProductId;
}

/** Paginated catalog lines (products page; variants loaded for that page only). */
export async function getPurchaseOrderCatalogTemplatePage(
  page = 1,
  limit = CATALOG_TEMPLATE_PAGE_SIZE
): Promise<PurchaseOrderCatalogTemplate> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 200);
  const skip = (safePage - 1) * safeLimit;

  const where = { deletedAt: null, isActive: true };
  const [products, totalProducts] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { name: "asc" }, skip, take: safeLimit }),
    prisma.product.count({ where }),
  ]);

  const productIds = products.map((p) => p.id);
  const variantsByProductId = await loadVariantsByProductIds(productIds);
  const items = buildLinesForProducts(products, variantsByProductId);

  return {
    title: "Full catalog order",
    lineCount: items.length,
    items,
    page: safePage,
    limit: safeLimit,
    totalProducts,
    hasMore: safePage * safeLimit < totalProducts,
  };
}

/** Full catalog assembled server-side in batches (safe for large catalogs). */
export async function getPurchaseOrderCatalogTemplateAll(): Promise<PurchaseOrderCatalogTemplate> {
  const allItems: PurchaseOrderCatalogTemplateLine[] = [];
  let page = 1;
  let totalProducts = 0;
  let hasMore = true;

  while (hasMore && page <= CATALOG_TEMPLATE_MAX_PAGES) {
    const batch = await getPurchaseOrderCatalogTemplatePage(page, CATALOG_TEMPLATE_PAGE_SIZE);
    totalProducts = batch.totalProducts ?? totalProducts;
    allItems.push(...batch.items);
    hasMore = batch.hasMore ?? false;
    page += 1;
  }

  return {
    title: "Full catalog order",
    lineCount: allItems.length,
    items: allItems,
    totalProducts,
    hasMore: false,
  };
}
