import type { PurchaseOrderDiscountByOrgType } from "@/lib/purchaseOrders/orgTypeDiscountDefaults";

/** Serializable tenant / application settings exposed to the client and API. */
export interface PublicAppSettings {
  appName: string;
  appTagline: string;
  /** Custom logo URL; empty string means use bundled default. */
  appLogoUrl: string;
  currency: string;
  timezone: string;
  memberDefaultDiscountPercent: number;
  defaultLowStockThreshold: number;
  receiptFooter: string;
  /** Default PO discount % by organization type (configured by ADMIN). */
  purchaseOrderDiscountByOrgType: PurchaseOrderDiscountByOrgType;
  /** From server at request time; product image upload requires a writable upload directory when false. */
  imageUploadEnabled: boolean;
}

/** Admin-only fields from GET /api/settings/app */
export interface AdminAppSettings extends PublicAppSettings {
  marketplaceFulfillmentBranchId?: string;
}
