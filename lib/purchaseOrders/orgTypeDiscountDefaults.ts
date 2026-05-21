import type { OrganizationType } from "@/types";

export const PO_DISCOUNT_ORG_TYPES = [
  "distributor",
  "franchise",
  "partner",
  "headquarters",
] as const satisfies readonly OrganizationType[];

export type PurchaseOrderDiscountByOrgType = Record<
  (typeof PO_DISCOUNT_ORG_TYPES)[number],
  number
>;

export const DEFAULT_PURCHASE_ORDER_DISCOUNT_BY_ORG_TYPE: PurchaseOrderDiscountByOrgType =
  {
    distributor: 0,
    franchise: 0,
    partner: 0,
    headquarters: 0,
  };

export function normalizePurchaseOrderDiscountByOrgType(
  raw?: Partial<PurchaseOrderDiscountByOrgType> | null
): PurchaseOrderDiscountByOrgType {
  const out = { ...DEFAULT_PURCHASE_ORDER_DISCOUNT_BY_ORG_TYPE };
  if (!raw) return out;
  for (const key of PO_DISCOUNT_ORG_TYPES) {
    const v = raw[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      out[key] = Math.min(100, Math.max(0, v));
    }
  }
  return out;
}

/** Client-safe lookup: discount % for an organization type from tenant settings map. */
export function getPurchaseOrderDiscountForOrgType(
  orgType: OrganizationType | string,
  settingsMap: PurchaseOrderDiscountByOrgType
): number {
  const normalized = normalizePurchaseOrderDiscountByOrgType(settingsMap);
  const key = orgType as keyof PurchaseOrderDiscountByOrgType;
  if (key in normalized) return normalized[key];
  return 0;
}
