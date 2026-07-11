import { Schema, model, models, Types, type Document } from "mongoose";

export interface IAd extends Document {
  productId: Types.ObjectId;
  creativeType: "image" | "video";
  creativeUrl: string;
  posterUrl?: string;
  headline?: string;
  caption?: string;
  isActive: boolean;
  sortOrder: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  impressions: number;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

const AdSchema = new Schema<IAd>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    creativeType: { type: String, required: true, enum: ["image", "video"] },
    creativeUrl: { type: String, required: true },
    posterUrl: { type: String },
    headline: { type: String, maxlength: 120 },
    caption: { type: String, maxlength: 240 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

AdSchema.index({ isActive: 1, deletedAt: 1, sortOrder: 1 });
AdSchema.index({ productId: 1 });
AdSchema.index({ startsAt: 1, endsAt: 1 });

export const Ad = models.Ad || model<IAd>("Ad", AdSchema);
