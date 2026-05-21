import type { IOrganizationSettings, OrganizationType } from "@/lib/db/models/Organization";

export const TYPE_DEFAULT_SETTINGS: Record<OrganizationType, IOrganizationSettings> = {
  headquarters: {
    canSellRetail: false,
    canDistribute: true,
    hasInventory: true,
    commissionEnabled: false,
    canSubmitOrders: false,
  },
  distributor: {
    canSellRetail: false,
    canDistribute: true,
    hasInventory: true,
    commissionEnabled: false,
    canSubmitOrders: true,
  },
  franchise: {
    canSellRetail: true,
    canDistribute: false,
    hasInventory: true,
    commissionEnabled: false,
    canSubmitOrders: true,
  },
  partner: {
    canSellRetail: true,
    canDistribute: false,
    hasInventory: false,
    commissionEnabled: true,
    canSubmitOrders: true,
  },
};
