/** Default unit cost as a share of retail when no separate cost field exists on products. */
export const PROCUREMENT_COST_RATIO = 0.4;

export function defaultProcurementUnitCost(retailPrice: number): number {
  if (!Number.isFinite(retailPrice) || retailPrice <= 0) return 0;
  return Math.max(0, Math.round(retailPrice * PROCUREMENT_COST_RATIO));
}
