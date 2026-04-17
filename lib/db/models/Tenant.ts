import mongoose, { Schema, model, models, type Document } from "mongoose";
import type { TenantStatus } from "@/types";

export interface ITenant extends Document {
  name: string;
  slug: string;
  domain?: string;
  logo?: string;
  email: string;
  phone?: string;
  address?: string;
  status: TenantStatus;
  settings: {
    currency: string;
    timezone: string;
    memberDiscount: number;
    lowStockThreshold: number;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    domain: { type: String, trim: true },
    logo: { type: String },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String },
    address: { type: String },
    status: {
      type: String,
      enum: ["active", "suspended", "trial"] as TenantStatus[],
      default: "trial",
    },
    settings: {
      currency: { type: String, default: "PHP" },
      timezone: { type: String, default: "Asia/Manila" },
      memberDiscount: { type: Number, default: 10, min: 0, max: 100 },
      lowStockThreshold: { type: Number, default: 10, min: 0 },
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

TenantSchema.index({ slug: 1 }, { unique: true });
TenantSchema.index({ status: 1, deletedAt: 1 });

export const Tenant = models.Tenant || model<ITenant>("Tenant", TenantSchema);
