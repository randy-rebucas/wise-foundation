import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppSettings } from "@/lib/db/models/AppSettings";
import type { PublicAppSettings } from "@/lib/types/appSettings";
import type { PatchAppSettingsInput } from "@/lib/validations/appSettings.schema";
import { imageUploadConfigured } from "@/lib/server/imageStorage";

const DEFAULTS: PublicAppSettings = {
  appName: "Glowish",
  appTagline: "POS & online store",
  currency: "PHP",
  timezone: "Asia/Manila",
  memberDefaultDiscountPercent: 10,
  defaultLowStockThreshold: 10,
  receiptFooter: "",
  imageUploadEnabled: false,
};

export function toPublicAppSettings(
  doc: {
    appName?: string;
    appTagline?: string;
    currency?: string;
    timezone?: string;
    memberDefaultDiscountPercent?: number;
    defaultLowStockThreshold?: number;
    receiptFooter?: string;
  } | null,
  imageUploadEnabled = false
): PublicAppSettings {
  if (!doc) return { ...DEFAULTS, imageUploadEnabled };
  return {
    appName: doc.appName ?? DEFAULTS.appName,
    appTagline: doc.appTagline ?? DEFAULTS.appTagline,
    currency: doc.currency ?? DEFAULTS.currency,
    timezone: doc.timezone ?? DEFAULTS.timezone,
    memberDefaultDiscountPercent:
      doc.memberDefaultDiscountPercent ?? DEFAULTS.memberDefaultDiscountPercent,
    defaultLowStockThreshold: doc.defaultLowStockThreshold ?? DEFAULTS.defaultLowStockThreshold,
    receiptFooter: doc.receiptFooter ?? DEFAULTS.receiptFooter,
    imageUploadEnabled,
  };
}

export async function getAppSettingsLean() {
  await connectDB();
  return AppSettings.findOne().lean();
}

export async function getPublicAppSettings(): Promise<PublicAppSettings> {
  const doc = await getAppSettingsLean();
  const imageUploadEnabled = await imageUploadConfigured();
  return toPublicAppSettings(doc, imageUploadEnabled);
}

export async function getDefaultLowStockThreshold(): Promise<number> {
  const doc = await getAppSettingsLean();
  return doc?.defaultLowStockThreshold ?? DEFAULTS.defaultLowStockThreshold;
}

export async function getAdminAppSettingsExtras() {
  const doc = await getAppSettingsLean();
  const branchId = doc?.marketplaceFulfillmentBranchId;
  return {
    marketplaceFulfillmentBranchId: branchId ? String(branchId) : "",
  };
}

export async function updateAppSettings(updates: PatchAppSettingsInput) {
  await connectDB();
  const existing = await AppSettings.findOne().sort({ createdAt: 1 });
  if (!existing) throw new Error("Application settings not found");

  const { marketplaceFulfillmentBranchId, ...rest } = updates;
  const set: Record<string, unknown> = { ...rest };
  if (marketplaceFulfillmentBranchId !== undefined) {
    set.marketplaceFulfillmentBranchId =
      marketplaceFulfillmentBranchId &&
      mongoose.isValidObjectId(marketplaceFulfillmentBranchId)
        ? new mongoose.Types.ObjectId(marketplaceFulfillmentBranchId)
        : null;
  }

  const doc = await AppSettings.findByIdAndUpdate(
    existing._id,
    { $set: set },
    { new: true, runValidators: true }
  ).lean();
  if (!doc) throw new Error("Application settings not found");
  const imageUploadEnabled = await imageUploadConfigured();
  return toPublicAppSettings(doc, imageUploadEnabled);
}
