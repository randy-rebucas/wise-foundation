import { Schema, model, models, type Document, type Types } from "mongoose";
import type { PurchaseOrderDiscountByOrgType } from "@/lib/purchaseOrders/orgTypeDiscountDefaults";

export interface IAppSettings extends Document {
  /** Branch that fulfills web marketplace orders (inventory deducted here). */
  marketplaceFulfillmentBranchId?: Types.ObjectId | null;
  appName: string;
  /** Short line under the logo (e.g. tagline). */
  appTagline: string;
  /** Custom logo URL (Cloudinary or /uploads). Empty uses default /logo.png. */
  appLogoUrl: string;
  /** Default meta description for storefront SEO (max 160). */
  seoDefaultDescription: string;
  /** Default Open Graph / Twitter image URL. */
  seoOgImageUrl: string;
  currency: string;
  timezone: string;
  setupCompleted: boolean;
  /** Default member discount % when registering a new member. */
  memberDefaultDiscountPercent: number;
  /** Default low-stock alert threshold for new branch inventory rows. */
  defaultLowStockThreshold: number;
  /** Optional footer line on receipts / checkout summary. */
  receiptFooter: string;
  /** Default purchase order discount % by organization type. */
  purchaseOrderDiscountByOrgType: PurchaseOrderDiscountByOrgType;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseOrderDiscountByOrgTypeSchema = new Schema(
  {
    distributor: { type: Number, default: 0, min: 0, max: 100 },
    franchise: { type: Number, default: 0, min: 0, max: 100 },
    partner: { type: Number, default: 0, min: 0, max: 100 },
    headquarters: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false }
);

const AppSettingsSchema = new Schema<IAppSettings>(
  {
    marketplaceFulfillmentBranchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
    appName: { type: String, required: true, default: "Glowish" },
    appTagline: { type: String, default: "POS & online store" },
    appLogoUrl: { type: String, default: "" },
    seoDefaultDescription: { type: String, default: "", maxlength: 160 },
    seoOgImageUrl: { type: String, default: "" },
    currency: { type: String, required: true, default: "PHP" },
    timezone: { type: String, required: true, default: "Asia/Manila" },
    setupCompleted: { type: Boolean, default: false },
    memberDefaultDiscountPercent: { type: Number, default: 10, min: 0, max: 100 },
    defaultLowStockThreshold: { type: Number, default: 10, min: 1 },
    receiptFooter: { type: String, default: "" },
    purchaseOrderDiscountByOrgType: {
      type: purchaseOrderDiscountByOrgTypeSchema,
      default: () => ({
        distributor: 0,
        franchise: 0,
        partner: 0,
        headquarters: 0,
      }),
    },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production") {
  delete (models as Record<string, unknown>).AppSettings;
}

export const AppSettings = models.AppSettings || model<IAppSettings>("AppSettings", AppSettingsSchema);
