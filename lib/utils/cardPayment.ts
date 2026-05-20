/** Client- and server-safe card helpers (no full PAN storage). */

export type CardBrand = "visa" | "mastercard" | "amex" | "unknown";

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function detectCardBrand(cardNumber: string): CardBrand {
  const n = digitsOnly(cardNumber);
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  return "unknown";
}

export function cardNumberMaxLength(brand: CardBrand): number {
  return brand === "amex" ? 15 : 16;
}

export function cvvMaxLength(brand: CardBrand): number {
  return brand === "amex" ? 4 : 3;
}

/** Luhn check for primary account number. */
export function isValidCardNumber(cardNumber: string): boolean {
  const n = digitsOnly(cardNumber);
  if (n.length < 13 || n.length > 19) return false;
  const brand = detectCardBrand(n);
  const expectedLen = cardNumberMaxLength(brand);
  if (brand !== "unknown" && n.length !== expectedLen) return false;

  let sum = 0;
  let alternate = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let digit = parseInt(n[i]!, 10);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export function formatCardNumberDisplay(cardNumber: string): string {
  const n = digitsOnly(cardNumber);
  const brand = detectCardBrand(n);
  const max = cardNumberMaxLength(brand);
  const trimmed = n.slice(0, max);
  if (brand === "amex") {
    return trimmed.replace(/(\d{4})(\d{0,6})(\d{0,5})/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(" ")
    );
  }
  return trimmed.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function isValidExpiry(month: string, year: string): boolean {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (!Number.isFinite(m) || m < 1 || m > 12) return false;
  if (!Number.isFinite(y) || year.length !== 2) return false;
  const now = new Date();
  const exp = new Date(2000 + y, m, 0, 23, 59, 59);
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return exp >= start;
}

export function isValidCvv(cvv: string, brand: CardBrand): boolean {
  const n = digitsOnly(cvv);
  return n.length === cvvMaxLength(brand);
}

export function cardBrandLabel(brand: CardBrand): string {
  switch (brand) {
    case "visa":
      return "Visa";
    case "mastercard":
      return "Mastercard";
    case "amex":
      return "American Express";
    default:
      return "Card";
  }
}

export interface ResolvedMarketplaceCardPayment {
  cardBrand: CardBrand;
  cardLast4: string;
  cardholderName: string;
  savedMethodId?: string;
  expMonth?: string;
  expYear?: string;
}

export function validateNewCardEntry(params: {
  cardholderName: string;
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvv: string;
}): { ok: true; resolved: ResolvedMarketplaceCardPayment } | { ok: false; error: string } {
  const name = params.cardholderName.trim();
  if (name.length < 2) return { ok: false, error: "Enter the name on the card" };

  const number = digitsOnly(params.cardNumber);
  if (!isValidCardNumber(number)) {
    return { ok: false, error: "Enter a valid card number" };
  }

  const brand = detectCardBrand(number);
  const month = params.expMonth.padStart(2, "0");
  const year = params.expYear.trim();
  if (!isValidExpiry(month, year)) {
    return { ok: false, error: "Card has expired or expiry date is invalid" };
  }

  if (!isValidCvv(params.cvv, brand)) {
    return { ok: false, error: "Enter a valid security code" };
  }

  return {
    ok: true,
    resolved: {
      cardBrand: brand,
      cardLast4: number.slice(-4),
      cardholderName: name,
      expMonth: month,
      expYear: year,
    },
  };
}
