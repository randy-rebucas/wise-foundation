/** Serializable tenant / application settings exposed to the client and API. */
export interface PublicAppSettings {
  appName: string;
  appTagline: string;
  currency: string;
  timezone: string;
  memberDefaultDiscountPercent: number;
  defaultLowStockThreshold: number;
  receiptFooter: string;
  /** From server env at request time; product image upload requires Cloudinary when false. */
  imageUploadEnabled: boolean;
}
