import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import { AppSettings } from "@/lib/db/models/AppSettings";
import type { PublicAppSettings } from "@/lib/types/appSettings";
import type { PatchAppSettingsInput } from "@/lib/validations/appSettings.schema";
import { imageUploadConfigured } from "@/lib/server/imageStorage";
import { maybeRemoveReplacedAppLogo } from "@/lib/services/appLogo.service";
import {
  DEFAULT_PURCHASE_ORDER_DISCOUNT_BY_ORG_TYPE,
  normalizePurchaseOrderDiscountByOrgType,
  PO_DISCOUNT_ORG_TYPES,
} from "@/lib/purchaseOrders/orgTypeDiscountDefaults";

const DEFAULTS: PublicAppSettings = {
  appName: "Glowish",
  appTagline: "POS & online store",
  appLogoUrl: "",
  currency: "PHP",
  timezone: "Asia/Manila",
  memberDefaultDiscountPercent: 10,
  defaultLowStockThreshold: 10,
  receiptFooter: "",
  purchaseOrderDiscountByOrgType: { ...DEFAULT_PURCHASE_ORDER_DISCOUNT_BY_ORG_TYPE },
  imageUploadEnabled: false,
};

export function toPublicAppSettings(
  doc: {
    appName?: string;
    appTagline?: string;
    appLogoUrl?: string;
    currency?: string;
    timezone?: string;
    memberDefaultDiscountPercent?: number;
    defaultLowStockThreshold?: number;
    receiptFooter?: string;
    purchaseOrderDiscountByOrgType?: Partial<
      PublicAppSettings["purchaseOrderDiscountByOrgType"]
    >;
  } | null
): PublicAppSettings {
  if (!doc) return { ...DEFAULTS, imageUploadEnabled: imageUploadConfigured() };
  return {
    appName: doc.appName ?? DEFAULTS.appName,
    appTagline: doc.appTagline ?? DEFAULTS.appTagline,
    appLogoUrl: doc.appLogoUrl?.trim() ?? DEFAULTS.appLogoUrl,
    currency: doc.currency ?? DEFAULTS.currency,
    timezone: doc.timezone ?? DEFAULTS.timezone,
    memberDefaultDiscountPercent:
      doc.memberDefaultDiscountPercent ?? DEFAULTS.memberDefaultDiscountPercent,
    defaultLowStockThreshold: doc.defaultLowStockThreshold ?? DEFAULTS.defaultLowStockThreshold,
    receiptFooter: doc.receiptFooter ?? DEFAULTS.receiptFooter,
    purchaseOrderDiscountByOrgType: normalizePurchaseOrderDiscountByOrgType(
      doc.purchaseOrderDiscountByOrgType
    ),
    imageUploadEnabled: imageUploadConfigured(),
  };
}

export async function getPurchaseOrderDiscountByOrgType() {
  const doc = await getAppSettingsLean();
  return normalizePurchaseOrderDiscountByOrgType(doc?.purchaseOrderDiscountByOrgType);
}

export async function getAppSettingsLean() {
  await connectDB();
  return AppSettings.findOne().lean();
}

export async function getPublicAppSettings(): Promise<PublicAppSettings> {
  const doc = await getAppSettingsLean();
  return toPublicAppSettings(doc);
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

  const { marketplaceFulfillmentBranchId, purchaseOrderDiscountByOrgType, ...rest } =
    updates;
  const set: Record<string, unknown> = { ...rest };

  if (rest.appLogoUrl !== undefined) {
    const next = String(rest.appLogoUrl).trim();
    const prev = existing.appLogoUrl?.trim() ?? "";
    if (prev && prev !== next) {
      await maybeRemoveReplacedAppLogo(prev);
    }
    set.appLogoUrl = next;
  }

  if (purchaseOrderDiscountByOrgType !== undefined) {
    const normalized = normalizePurchaseOrderDiscountByOrgType(
      purchaseOrderDiscountByOrgType
    );
    for (const key of PO_DISCOUNT_ORG_TYPES) {
      set[`purchaseOrderDiscountByOrgType.${key}`] = normalized[key];
    }
  }

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
  return toPublicAppSettings(doc);
}
