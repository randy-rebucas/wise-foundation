import { Schema, model, models, type Document, type Types } from "mongoose";

export interface IAppSettings extends Document {
  /** Branch that fulfills web marketplace orders (inventory deducted here). */
  marketplaceFulfillmentBranchId?: Types.ObjectId | null;
  appName: string;
  /** Short line under the logo (e.g. tagline). */
  appTagline: string;
  currency: string;
  timezone: string;
  setupCompleted: boolean;
  /** Default member discount % when registering a new member. */
  memberDefaultDiscountPercent: number;
  /** Default low-stock alert threshold for new branch inventory rows. */
  defaultLowStockThreshold: number;
  /** Optional footer line on receipts / checkout summary. */
  receiptFooter: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppSettingsSchema = new Schema<IAppSettings>(
  {
    marketplaceFulfillmentBranchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
    appName: { type: String, required: true, default: "Glowish" },
    appTagline: { type: String, default: "POS & online store" },
    currency: { type: String, required: true, default: "PHP" },
    timezone: { type: String, required: true, default: "Asia/Manila" },
    setupCompleted: { type: Boolean, default: false },
    memberDefaultDiscountPercent: { type: Number, default: 10, min: 0, max: 100 },
    defaultLowStockThreshold: { type: Number, default: 10, min: 1 },
    receiptFooter: { type: String, default: "" },
  },
  { timestamps: true }
);

export const AppSettings = models.AppSettings || model<IAppSettings>("AppSettings", AppSettingsSchema);
