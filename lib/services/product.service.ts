import { connectDB } from "@/lib/db/connect";
import { Product, type IProduct } from "@/lib/db/models/Product";
import { ProductVariant } from "@/lib/db/models/ProductVariant";
import { Inventory } from "@/lib/db/models/Inventory";
import { slugify } from "@/lib/utils";
import type { CreateProductInput, CreateVariantInput } from "@/lib/validations/product.schema";
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
