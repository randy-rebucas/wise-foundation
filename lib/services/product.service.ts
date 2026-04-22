import { connectDB } from "@/lib/db/connect";
import { Product, type IProduct } from "@/lib/db/models/Product";
import { ProductVariant } from "@/lib/db/models/ProductVariant";
import { Inventory } from "@/lib/db/models/Inventory";
import { slugify } from "@/lib/utils";
import { parseCsv, serializeCsv } from "@/lib/utils/csv";
import {
  createProductSchema,
  type CreateProductInput,
  type CreateVariantInput,
} from "@/lib/validations/product.schema";
import type { ProductCategory } from "@/types";

interface ProductFilter {
  category?: ProductCategory;
  search?: string;
  isActive?: boolean;
}

export async function getProducts(filter: ProductFilter = {}, page = 1, limit = 20) {
  await connectDB();

  const query: Record<string, unknown> = { deletedAt: null };
  if (filter.category) query.category = filter.category;
  if (filter.isActive !== undefined) query.isActive = filter.isActive;
  if (filter.search) {
    query.$text = { $search: filter.search };
  }

  const skip = (page - 1) * limit;
  const [products, total] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(query),
  ]);

  return { products, total, pages: Math.ceil(total / limit) };
}

export async function getProductById(productId: string) {
  await connectDB();
  const product = await Product.findOne({ _id: productId, deletedAt: null }).lean();
  if (!product) return null;

  const variants = await ProductVariant.find({ productId, deletedAt: null }).lean();

  return { ...product, variants };
}

export async function createProduct(data: CreateProductInput) {
  await connectDB();

  const existingSku = await Product.findOne({ sku: data.sku });
  if (existingSku) throw new Error(`SKU "${data.sku}" already exists`);

  const slug = slugify(data.name);
  return Product.create({ ...data, slug });
}

export async function updateProduct(productId: string, data: Partial<IProduct>) {
  await connectDB();
  return Product.findOneAndUpdate(
    { _id: productId, deletedAt: null },
    { $set: data },
    { new: true, runValidators: true }
  ).lean();
}

export async function deleteProduct(productId: string) {
  await connectDB();
  return Product.findOneAndUpdate(
    { _id: productId },
    { $set: { deletedAt: new Date(), isActive: false } },
    { new: true }
  ).lean();
}

export async function createProductVariant(productId: string, data: CreateVariantInput) {
  await connectDB();
  const existingSku = await ProductVariant.findOne({ sku: data.sku });
  if (existingSku) throw new Error(`SKU "${data.sku}" already exists`);
  return ProductVariant.create({ ...data, productId });
}

export async function getProductVariants(productId: string) {
  await connectDB();
  return ProductVariant.find({ productId, deletedAt: null }).lean();
}

export async function updateProductVariant(variantId: string, data: Partial<CreateVariantInput>) {
  await connectDB();
  return ProductVariant.findOneAndUpdate(
    { _id: variantId, deletedAt: null },
    { $set: data },
    { new: true, runValidators: true }
  ).lean();
}

export async function deleteProductVariant(variantId: string) {
  await connectDB();
  return ProductVariant.findOneAndUpdate(
    { _id: variantId },
    { $set: { deletedAt: new Date(), isActive: false } },
    { new: true }
  ).lean();
}

export async function getProductsForPOS(branchId: string, search?: string) {
  await connectDB();

  const query: Record<string, unknown> = { isActive: true, deletedAt: null };
  if (search) query.$text = { $search: search };

  const products = await Product.find(query).sort({ name: 1 }).limit(50).lean();
  const productIds = products.map((p) => p._id);

  const [inventoryItems, variantsList] = await Promise.all([
    Inventory.find({ branchId, productId: { $in: productIds } }).lean(),
    ProductVariant.find({ productId: { $in: productIds }, isActive: true, deletedAt: null }).lean(),
  ]);

  const baseStockMap = new Map<string, number>();
  const variantStockMap = new Map<string, number>();
  for (const item of inventoryItems) {
    const key = item.productId.toString();
    if (!item.variantId) {
      baseStockMap.set(key, (baseStockMap.get(key) ?? 0) + item.quantity);
    } else {
      variantStockMap.set(item.variantId.toString(), item.quantity);
    }
  }

  const variantsByProduct = new Map<string, typeof variantsList>();
  for (const v of variantsList) {
    const pid = v.productId.toString();
    if (!variantsByProduct.has(pid)) variantsByProduct.set(pid, []);
    variantsByProduct.get(pid)!.push(v);
  }

  return products.map((p) => {
    const pid = p._id.toString();
    const productVariants = variantsByProduct.get(pid) ?? [];
    const variantsWithStock = productVariants.map((v) => ({
      ...v,
      stock: variantStockMap.get(v._id.toString()) ?? 0,
    }));
    return {
      ...p,
      stock: baseStockMap.get(pid) ?? 0,
      variants: variantsWithStock,
    };
  });
}

const IMPORT_MAX_ROWS = 5000;

const CSV_HEADERS = [
  "sku",
  "name",
  "description",
  "category",
  "barcode",
  "retailprice",
  "memberprice",
  "distributorprice",
  "cost",
  "isactive",
  "tags",
] as const;

function normalizeCsvHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_]+/g, "");
}

function parsePriceCell(raw: string): number | null {
  const s = raw.replace(/,/g, "").trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseBoolCell(raw: string, defaultVal: boolean): boolean {
  const v = raw.trim().toLowerCase();
  if (!v) return defaultVal;
  if (["1", "true", "yes", "y"].includes(v)) return true;
  if (["0", "false", "no", "n"].includes(v)) return false;
  return defaultVal;
}

function parseTagsCell(raw: string): string[] {
  if (!raw.trim()) return [];
  if (raw.includes(";")) return raw.split(";").map((t) => t.trim()).filter(Boolean);
  return raw.split(",").map((t) => t.trim()).filter(Boolean);
}

export async function exportProductsToCsv(): Promise<string> {
  await connectDB();
  const products = await Product.find({ deletedAt: null }).sort({ sku: 1 }).lean();
  const dataRows: string[][] = products.map((p) => [
    p.sku,
    p.name,
    p.description ?? "",
    p.category,
    p.barcode ?? "",
    String(p.retailPrice),
    String(p.memberPrice),
    String(p.distributorPrice),
    String(p.cost),
    p.isActive ? "true" : "false",
    (p.tags ?? []).join("; "),
  ]);
  return "\uFEFF" + serializeCsv([[...CSV_HEADERS], ...dataRows]);
}

export interface ProductImportRowError {
  row: number;
  sku?: string;
  message: string;
}

export interface ProductImportResult {
  created: number;
  updated: number;
  errors: ProductImportRowError[];
}

export async function importProductsFromCsv(csv: string): Promise<ProductImportResult> {
  await connectDB();
  const rows = parseCsv(csv);
  const errors: ProductImportRowError[] = [];

  if (rows.length < 2) {
    return {
      created: 0,
      updated: 0,
      errors: [{ row: 1, message: "CSV must include a header row and at least one data row." }],
    };
  }

  const headerRow = rows[0]!.map(normalizeCsvHeader);
  const col = (key: (typeof CSV_HEADERS)[number]) => headerRow.indexOf(key);

  for (const key of CSV_HEADERS) {
    if (col(key) < 0) {
      errors.push({
        row: 1,
        message: `Missing required column "${key}". Expected headers: ${CSV_HEADERS.join(", ")}.`,
      });
      return { created: 0, updated: 0, errors };
    }
  }

  const dataRowCount = rows.length - 1;
  if (dataRowCount > IMPORT_MAX_ROWS) {
    return {
      created: 0,
      updated: 0,
      errors: [{ row: 0, message: `Too many rows (max ${IMPORT_MAX_ROWS}).` }],
    };
  }

  let created = 0;
  let updated = 0;

  for (let i = 1; i < rows.length; i++) {
    const line = rows[i]!;
    const rowNum = i + 1;
    const get = (key: (typeof CSV_HEADERS)[number]) => {
      const idx = col(key);
      return idx < line.length ? line[idx]! : "";
    };

    const sku = get("sku").trim();
    if (!sku) {
      errors.push({ row: rowNum, message: "SKU is empty." });
      continue;
    }

    const name = get("name").trim();
    const description = get("description").trim();
    const categoryRaw = get("category").trim().toLowerCase() as ProductCategory;
    const barcode = get("barcode").trim();
    const retailPrice = parsePriceCell(get("retailprice"));
    const memberPrice = parsePriceCell(get("memberprice"));
    const distributorPrice = parsePriceCell(get("distributorprice"));
    const cost = parsePriceCell(get("cost"));
    const isActive = parseBoolCell(get("isactive"), true);
    const tags = parseTagsCell(get("tags"));

    if (retailPrice === null || memberPrice === null || distributorPrice === null || cost === null) {
      errors.push({ row: rowNum, sku, message: "Invalid or missing numeric price field." });
      continue;
    }

    const payload = {
      name,
      description: description || undefined,
      category: categoryRaw,
      sku,
      barcode: barcode || undefined,
      retailPrice,
      memberPrice,
      distributorPrice,
      cost,
      isActive,
      tags,
      images: [] as string[],
    };

    const parsed = createProductSchema.safeParse(payload);
    if (!parsed.success) {
      errors.push({
        row: rowNum,
        sku,
        message: parsed.error.issues.map((e) => e.message).join("; "),
      });
      continue;
    }

    try {
      const existing = await Product.findOne({ sku: parsed.data.sku, deletedAt: null }).lean();
      if (existing) {
        await Product.findOneAndUpdate(
          { _id: existing._id, deletedAt: null },
          {
            $set: {
              ...parsed.data,
              slug: slugify(parsed.data.name),
            },
          },
          { runValidators: true }
        );
        updated++;
      } else {
        await createProduct(parsed.data);
        created++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed.";
      errors.push({ row: rowNum, sku, message: msg });
    }
  }

  return { created, updated, errors };
}
