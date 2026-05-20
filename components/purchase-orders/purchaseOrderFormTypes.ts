export type OrganizationType = "distributor" | "franchise" | "partner" | "headquarters";

export interface Organization {
  _id: string;
  name: string;
  type: OrganizationType;
}

export interface ProductHit {
  _id: string;
  name: string;
  sku: string;
  retailPrice: number;
  variantCount?: number | null;
}

export interface ProductVariantOption {
  _id: string;
  name: string;
  sku: string;
  retailPrice: number;
  isActive?: boolean;
}

export interface POItem {
  productId: string;
  productName: string;
  baseProductName?: string;
  sku: string;
  variantId?: string;
  variants?: ProductVariantOption[];
  variantsLoading?: boolean;
  quantity: number;
  unitCost: number;
}

export const defaultPOItem: POItem = {
  productId: "",
  productName: "",
  sku: "",
  quantity: 1,
  unitCost: 0,
};

/** Line shape from GET /api/purchase-orders/template */
export interface PurchaseOrderCatalogTemplateLine {
  productId: string;
  productName: string;
  baseProductName: string;
  sku: string;
  variantId?: string;
  variants?: ProductVariantOption[];
  quantity: number;
  unitCost: number;
}

export interface PurchaseOrderCatalogTemplate {
  title: string;
  lineCount: number;
  items: PurchaseOrderCatalogTemplateLine[];
}
