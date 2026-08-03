import type { OrganizationType } from "@prisma/client";

export interface OrganizationSettings {
  canSellRetail: boolean;
  canDistribute: boolean;
  hasInventory: boolean;
  commissionEnabled: boolean;
  canSubmitOrders: boolean;
}

export const TYPE_DEFAULT_SETTINGS: Record<OrganizationType, OrganizationSettings> = {
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
