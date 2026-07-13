import { randomInt } from "node:crypto";

export type SpinPrizeId = "percent_5" | "percent_10" | "free_shipping" | "free_perfume";

export type SpinPrizeDef = {
  id: SpinPrizeId;
  label: string;
  weight: number;
  couponType: "percent" | "fixed" | "free_shipping" | "free_item";
  value: number;
  /** Only "free_perfume" needs a designated product; resolved by the caller. */
  requiresFreeGiftProduct?: boolean;
};

export const SPIN_PRIZES: SpinPrizeDef[] = [
  { id: "percent_5", label: "5% Off", weight: 35, couponType: "percent", value: 5 },
  { id: "percent_10", label: "10% Off", weight: 15, couponType: "percent", value: 10 },
  {
    id: "free_shipping",
    label: "Free Shipping",
    weight: 35,
    couponType: "free_shipping",
    value: 0,
  },
  {
    id: "free_perfume",
    label: "Free Perfume",
    weight: 15,
    couponType: "free_item",
    value: 0,
    requiresFreeGiftProduct: true,
  },
];

export const SPIN_COUPON_VALID_DAYS = 30;

/** Server-authoritative weighted pick. `hasFreeGiftProduct` excludes free_perfume when unset, renormalizing weights. */
export function pickWeightedPrize(hasFreeGiftProduct: boolean): SpinPrizeDef {
  const pool = SPIN_PRIZES.filter((p) => !p.requiresFreeGiftProduct || hasFreeGiftProduct);
  const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
  const roll = randomInt(totalWeight);
  let cursor = 0;
  for (const prize of pool) {
    cursor += prize.weight;
    if (roll < cursor) return prize;
  }
  return pool[pool.length - 1];
}
