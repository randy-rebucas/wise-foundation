import { Schema, model, models, type Document } from "mongoose";
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
  memberPrice: number;
  distributorPrice: number;
  cost: number;
  isActive: boolean;
  tags: string[];
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
    memberPrice: { type: Number, required: true, min: 0 },
    distributorPrice: { type: Number, required: true, min: 0 },
    cost: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    tags: [{ type: String }],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ProductSchema.index({ sku: 1 }, { unique: true });
ProductSchema.index({ category: 1, deletedAt: 1 });
ProductSchema.index({ isActive: 1, deletedAt: 1 });
ProductSchema.index({ name: "text", tags: "text" });

export const Product = models.Product || model<IProduct>("Product", ProductSchema);
