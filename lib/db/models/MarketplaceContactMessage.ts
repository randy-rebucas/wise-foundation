import { Schema, model, models, type Document } from "mongoose";

export interface IMarketplaceContactMessage extends Document {
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const MarketplaceContactMessageSchema = new Schema<IMarketplaceContactMessage>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

MarketplaceContactMessageSchema.index({ createdAt: -1 });

export const MarketplaceContactMessage =
  models.MarketplaceContactMessage ||
  model<IMarketplaceContactMessage>("MarketplaceContactMessage", MarketplaceContactMessageSchema);
