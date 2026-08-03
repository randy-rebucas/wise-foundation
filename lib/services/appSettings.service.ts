import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import type { AppSettings } from "@prisma/client";
import type { PublicAppSettings } from "@/lib/types/appSettings";
import type { PatchAppSettingsInput } from "@/lib/validations/appSettings.schema";
import { imageUploadConfigured } from "@/lib/server/imageStorage";
import { maybeRemoveReplacedAppLogo } from "@/lib/services/appLogo.service";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit.service";
import {
  DEFAULT_PURCHASE_ORDER_DISCOUNT_BY_ORG_TYPE,
  normalizePurchaseOrderDiscountByOrgType,
  type PurchaseOrderDiscountByOrgType,
} from "@/lib/purchaseOrders/orgTypeDiscountDefaults";

const DEFAULTS: PublicAppSettings = {
  appName: "Glowish",
  appTagline: "POS & online store",
  appLogoUrl: "",
  seoDefaultDescription: "",
  seoOgImageUrl: "",
  currency: "PHP",
  timezone: "Asia/Manila",
  memberDefaultDiscountPercent: 10,
  defaultLowStockThreshold: 10,
  receiptFooter: "",
  purchaseOrderDiscountByOrgType: { ...DEFAULT_PURCHASE_ORDER_DISCOUNT_BY_ORG_TYPE },
  imageUploadEnabled: false,
};

function discountColumnsToMap(
  doc: Pick<
    AppSettings,
    "discountDistributor" | "discountFranchise" | "discountPartner" | "discountHeadquarters"
  >
): PurchaseOrderDiscountByOrgType {
  return normalizePurchaseOrderDiscountByOrgType({
    distributor: doc.discountDistributor,
    franchise: doc.discountFranchise,
    partner: doc.discountPartner,
    headquarters: doc.discountHeadquarters,
  });
}

function discountMapToColumns(map: Partial<PurchaseOrderDiscountByOrgType>) {
  const normalized = normalizePurchaseOrderDiscountByOrgType(map);
  return {
    discountDistributor: normalized.distributor,
    discountFranchise: normalized.franchise,
    discountPartner: normalized.partner,
    discountHeadquarters: normalized.headquarters,
  };
}

export function toPublicAppSettings(doc: AppSettings | null): PublicAppSettings {
  if (!doc) return { ...DEFAULTS, imageUploadEnabled: imageUploadConfigured() };
  return {
    appName: doc.appName ?? DEFAULTS.appName,
    appTagline: doc.appTagline ?? DEFAULTS.appTagline,
    appLogoUrl: doc.appLogoUrl?.trim() ?? DEFAULTS.appLogoUrl,
    seoDefaultDescription: doc.seoDefaultDescription?.trim() ?? DEFAULTS.seoDefaultDescription,
    seoOgImageUrl: doc.seoOgImageUrl?.trim() ?? DEFAULTS.seoOgImageUrl,
    currency: doc.currency ?? DEFAULTS.currency,
    timezone: doc.timezone ?? DEFAULTS.timezone,
    memberDefaultDiscountPercent:
      doc.memberDefaultDiscountPercent ?? DEFAULTS.memberDefaultDiscountPercent,
    defaultLowStockThreshold: doc.defaultLowStockThreshold ?? DEFAULTS.defaultLowStockThreshold,
    receiptFooter: doc.receiptFooter ?? DEFAULTS.receiptFooter,
    purchaseOrderDiscountByOrgType: discountColumnsToMap(doc),
    imageUploadEnabled: imageUploadConfigured(),
  };
}

export async function getPurchaseOrderDiscountByOrgType() {
  const doc = await getAppSettingsLean();
  if (!doc) return { ...DEFAULT_PURCHASE_ORDER_DISCOUNT_BY_ORG_TYPE };
  return discountColumnsToMap(doc);
}

export async function getAppSettingsLean() {
  return prisma.appSettings.findFirst();
}

export const getPublicAppSettings = unstable_cache(
  async (): Promise<PublicAppSettings> => {
    const doc = await getAppSettingsLean();
    return toPublicAppSettings(doc);
  },
  ["public-app-settings"],
  { tags: ["app-settings"], revalidate: 30 }
);

export async function getDefaultLowStockThreshold(): Promise<number> {
  const doc = await getAppSettingsLean();
  return doc?.defaultLowStockThreshold ?? DEFAULTS.defaultLowStockThreshold;
}

export async function getAdminAppSettingsExtras() {
  const doc = await getAppSettingsLean();
  return {
    marketplaceFulfillmentBranchId: doc?.marketplaceFulfillmentBranchId ?? "",
    spinWheelFreeGiftProductId: doc?.spinWheelFreeGiftProductId ?? "",
  };
}

export interface InitialSetupInput {
  appName: string;
  currency: string;
  timezone: string;
  adminName: string;
  adminEmail: string;
  adminPasswordHash: string;
}

const DEFAULT_APP_TAGLINE = "POS & online store";
const DEFAULT_MEMBER_DISCOUNT = 10;
const DEFAULT_LOW_STOCK = 10;

/** First-run setup: creates/updates AppSettings and the initial ADMIN user in one transaction. */
export async function runInitialSetup(input: InitialSetupInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existingAdmin = await tx.user.findFirst({ where: { role: "ADMIN", deletedAt: null } });
    if (existingAdmin) throw new Error("An admin user already exists");

    const emailTaken = await tx.user.findFirst({ where: { email: input.adminEmail.toLowerCase() } });
    if (emailTaken) throw new Error("Email already in use");

    const settingsRow = await tx.appSettings.findFirst({ orderBy: { id: "asc" } });
    if (settingsRow?.setupCompleted) throw new Error("Setup already completed");

    const settingsPayload = {
      appName: input.appName,
      currency: input.currency,
      timezone: input.timezone,
      setupCompleted: true,
      appTagline: DEFAULT_APP_TAGLINE,
      memberDefaultDiscountPercent: DEFAULT_MEMBER_DISCOUNT,
      defaultLowStockThreshold: DEFAULT_LOW_STOCK,
      receiptFooter: "",
    };

    if (settingsRow) {
      await tx.appSettings.update({ where: { id: settingsRow.id }, data: settingsPayload });
    } else {
      await tx.appSettings.create({ data: settingsPayload });
    }

    await tx.user.create({
      data: {
        name: input.adminName,
        email: input.adminEmail.toLowerCase(),
        password: input.adminPasswordHash,
        role: "ADMIN",
        permissions: [],
        isActive: true,
      },
    });
  });
}

export async function updateAppSettings(updates: PatchAppSettingsInput, actor?: AuditActor) {
  const existing = await prisma.appSettings.findFirst({ orderBy: { createdAt: "asc" } });
  if (!existing) throw new Error("Application settings not found");

  const {
    marketplaceFulfillmentBranchId,
    spinWheelFreeGiftProductId,
    purchaseOrderDiscountByOrgType,
    ...rest
  } = updates;
  const data: Record<string, unknown> = { ...rest };

  if (rest.appLogoUrl !== undefined) {
    const next = String(rest.appLogoUrl).trim();
    const prev = existing.appLogoUrl?.trim() ?? "";
    if (prev && prev !== next) {
      await maybeRemoveReplacedAppLogo(prev);
    }
    data.appLogoUrl = next;
  }

  if (rest.seoOgImageUrl !== undefined) {
    data.seoOgImageUrl = String(rest.seoOgImageUrl).trim();
  }

  if (rest.seoDefaultDescription !== undefined) {
    data.seoDefaultDescription = String(rest.seoDefaultDescription).trim();
  }

  if (purchaseOrderDiscountByOrgType !== undefined) {
    Object.assign(data, discountMapToColumns(purchaseOrderDiscountByOrgType));
  }

  if (marketplaceFulfillmentBranchId !== undefined) {
    data.marketplaceFulfillmentBranchId = marketplaceFulfillmentBranchId || null;
  }

  if (spinWheelFreeGiftProductId !== undefined) {
    data.spinWheelFreeGiftProductId = spinWheelFreeGiftProductId || null;
  }

  const doc = await prisma.appSettings.update({
    where: { id: existing.id },
    data,
  });
  revalidateTag("app-settings", "seconds");

  if (actor) {
    void writeAuditLog({
      action: "settings.updated",
      actor,
      targetType: "AppSettings",
      metadata: { fields: Object.keys(updates) },
    });
  }

  return toPublicAppSettings(doc);
}
