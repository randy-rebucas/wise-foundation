/**
 * Indicative Philippine courier rate tables (J&T, Flash Express, Lalamove).
 * Used for checkout quotes; tune in one place when carrier tariffs change.
 */

export type ShippingZone = "ncr" | "luzon" | "visayas" | "mindanao";
export type ParcelWeightTier = "light" | "medium" | "heavy";
export type MarketplaceCourierId = "jt" | "flash" | "lalamove";

/** Parcel tier from order merchandise subtotal (proxy for weight). */
export function resolveParcelWeightTier(subtotal: number): ParcelWeightTier {
  if (subtotal <= 1200) return "light";
  if (subtotal <= 3500) return "medium";
  return "heavy";
}

const NCR_REGION_CITY_KEYWORDS = [
  "metro manila",
  "national capital",
  "ncr",
  "quezon city",
  "quezon",
  "manila",
  "makati",
  "pasig",
  "taguig",
  "mandaluyong",
  "pasay",
  "caloocan",
  "parañaque",
  "paranaque",
  "marikina",
  "muntinlupa",
  "las piñas",
  "las pinas",
  "san juan",
  "valenzuela",
  "malabon",
  "navotas",
  "pateros",
];

const LUZON_KEYWORDS = [
  "luzon",
  "bulacan",
  "cavite",
  "laguna",
  "rizal",
  "batangas",
  "pampanga",
  "nueva ecija",
  "tarlac",
  "zambales",
  "bataan",
  "pangasinan",
  "la union",
  "ilocos",
  "cagayan",
  "isabela",
  "bicol",
  "albay",
  "quezon province",
  "aurora",
  "benguet",
];

const VISAYAS_KEYWORDS = [
  "visayas",
  "cebu",
  "bohol",
  "iloilo",
  "negros",
  "leyte",
  "samar",
  "panay",
  "bacolod",
  "dumaguete",
  "tagbilaran",
];

export function resolveShippingZone(region: string, city: string): ShippingZone {
  const blob = `${region} ${city}`.toLowerCase();
  if (NCR_REGION_CITY_KEYWORDS.some((k) => blob.includes(k))) return "ncr";
  if (VISAYAS_KEYWORDS.some((k) => blob.includes(k))) return "visayas";
  if (blob.includes("mindanao") || blob.includes("davao") || blob.includes("zamboanga")) {
    return "mindanao";
  }
  if (LUZON_KEYWORDS.some((k) => blob.includes(k)) || blob.includes("luzon")) {
    return "luzon";
  }
  return "luzon";
}

export function isMetroManilaDelivery(region: string, city: string): boolean {
  return resolveShippingZone(region, city) === "ncr";
}

/** Base parcel freight (PHP), before COD service fee. */
const JNT_BASE_RATES: Record<ShippingZone, Record<ParcelWeightTier, number>> = {
  ncr: { light: 89, medium: 119, heavy: 149 },
  luzon: { light: 109, medium: 149, heavy: 179 },
  visayas: { light: 129, medium: 169, heavy: 199 },
  mindanao: { light: 139, medium: 179, heavy: 209 },
};

const FLASH_BASE_RATES: Record<ShippingZone, Record<ParcelWeightTier, number>> = {
  ncr: { light: 99, medium: 129, heavy: 159 },
  luzon: { light: 119, medium: 159, heavy: 189 },
  visayas: { light: 139, medium: 179, heavy: 209 },
  mindanao: { light: 149, medium: 189, heavy: 219 },
};

const LALAMOVE_BASE_RATES: Record<ParcelWeightTier, number> = {
  light: 149,
  medium: 199,
  heavy: 249,
};

export type CourierCodFeeRule = {
  ratePercent: number;
  minFee: number;
  maxFee: number;
};

export const COURIER_COD_FEE_RULES: Record<MarketplaceCourierId, CourierCodFeeRule> = {
  jt: { ratePercent: 3, minFee: 29, maxFee: 200 },
  flash: { ratePercent: 3, minFee: 35, maxFee: 200 },
  lalamove: { ratePercent: 0, minFee: 0, maxFee: 0 },
};

export function computeCourierCodFee(
  courier: MarketplaceCourierId,
  collectibleAmount: number
): number {
  const rule = COURIER_COD_FEE_RULES[courier];
  if (rule.ratePercent <= 0 || collectibleAmount <= 0) return 0;
  const raw = (collectibleAmount * rule.ratePercent) / 100;
  const fee = Math.max(rule.minFee, raw);
  return Math.round(Math.min(rule.maxFee, fee) * 100) / 100;
}

export function computeCourierBaseShipping(
  courier: MarketplaceCourierId,
  zone: ShippingZone,
  tier: ParcelWeightTier
): number {
  if (courier === "lalamove") {
    if (zone !== "ncr") {
      throw new Error("Lalamove on-demand delivery is only available in Metro Manila");
    }
    return LALAMOVE_BASE_RATES[tier];
  }
  const table = courier === "flash" ? FLASH_BASE_RATES : JNT_BASE_RATES;
  return table[zone][tier];
}
