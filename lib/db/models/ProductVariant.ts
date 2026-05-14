import mongoose, { Schema, model, type Document, type Types } from "mongoose";

export interface IProductVariant extends Document {
  productId: Types.ObjectId;
  name: string;
  sku: string;
  attributes: { key: string; value: string }[];
  retailPrice: number;
  images: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true },
    attributes: [
      {
        key: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
    retailPrice: { type: Number, required: true, min: 0 },
    images: [{ type: String }],
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ProductVariantSchema.index({ productId: 1, deletedAt: 1 });
ProductVariantSchema.index({ sku: 1 }, { unique: true });

if (mongoose.models.ProductVariant) {
  mongoose.deleteModel("ProductVariant");
}

export const ProductVariant = model<IProductVariant>(
  "ProductVariant",
  ProductVariantSchema
);
