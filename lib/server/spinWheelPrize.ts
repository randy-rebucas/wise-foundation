import "server-only";
import { randomInt } from "node:crypto";
import { SPIN_PRIZES, type SpinPrizeDef } from "@/lib/constants/spinWheel";

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
