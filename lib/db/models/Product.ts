import mongoose, { Schema, model, type Document } from "mongoose";
import type { ProductCategory } from "@/types";

export interface IProduct extends Document {
  name: string;
  slug: string;
  description?: string;
  category: ProductCategory;
  sku: string;
  barcode?: string;
  images: string[];
  retailPrice: number;
  isActive: boolean;
  tags: string[];
  /** When false, product is hidden from the public marketplace catalog. */
  marketplaceListed?: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String },
    category: {
      type: String,
      required: true,
      enum: ["homecare", "cosmetics", "wellness", "scent"] as ProductCategory[],
    },
    sku: { type: String, required: true, unique: true, trim: true },
    barcode: { type: String },
    images: [{ type: String }],
    retailPrice: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    tags: [{ type: String }],
    marketplaceListed: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ProductSchema.index({ category: 1, deletedAt: 1 });
ProductSchema.index({ isActive: 1, deletedAt: 1 });
ProductSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
ProductSchema.index({ name: "text", tags: "text" });

/** Drop stale compiled model (Next.js dev / HMR) so schema changes apply. */
if (mongoose.models.Product) {
  mongoose.deleteModel("Product");
}

export const Product = model<IProduct>("Product", ProductSchema);
