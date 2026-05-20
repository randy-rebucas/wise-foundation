/** GCash / Philippine mobile wallet helpers (no full account storage). */

import { digitsOnly } from "@/lib/utils/cardPayment";

export function normalizePhilippineMobile(input: string): string | null {
  let d = digitsOnly(input);
  if (d.startsWith("63") && d.length === 12) {
    d = `0${d.slice(2)}`;
  }
  if (d.startsWith("9") && d.length === 10) {
    d = `0${d}`;
  }
  if (/^09\d{9}$/.test(d)) return d;
  return null;
}

export function isValidPhilippineMobile(input: string): boolean {
  return normalizePhilippineMobile(input) !== null;
}

export function formatPhilippineMobileDisplay(input: string): string {
  const n = normalizePhilippineMobile(input);
  if (!n) return digitsOnly(input).slice(0, 11);
  return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
}

export function maskPhilippineMobile(input: string): string {
  const n = normalizePhilippineMobile(input);
  if (!n) return "09** *** ****";
  return `${n.slice(0, 4)} *** **${n.slice(-2)}`;
}

export interface ResolvedMarketplaceGcashPayment {
  accountName: string;
  mobileLast4: string;
  mobileMasked: string;
  savedMethodId?: string;
}

/** Payload sent to checkout API (full number validated server-side, not stored on order). */
export interface MarketplaceGcashPaymentPayload {
  accountName: string;
  mobileNumber: string;
}

export function validateGcashEntry(params: {
  accountName: string;
  mobileNumber: string;
}): { ok: true; resolved: GcashEntryResolved } | { ok: false; error: string } {
  const accountName = params.accountName.trim();
  if (accountName.length < 2) {
    return { ok: false, error: "Enter the name registered on your GCash account" };
  }

  const normalized = normalizePhilippineMobile(params.mobileNumber);
  if (!normalized) {
    return { ok: false, error: "Enter a valid Philippine mobile number (09XX XXX XXXX)" };
  }

  return {
    ok: true,
    resolved: {
      accountName,
      mobileLast4: normalized.slice(-4),
      mobileMasked: maskPhilippineMobile(normalized),
      mobileNumber: normalized,
    },
  };
}

export type GcashEntryResolved = ResolvedMarketplaceGcashPayment & {
  mobileNumber: string;
};
