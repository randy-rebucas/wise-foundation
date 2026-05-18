import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function toFiniteCurrencyAmount(amount: unknown): number {
  const n = typeof amount === "number" ? amount : Number(amount);
  return Number.isFinite(n) ? n : 0;
}

export function formatCurrency(amount: number, currency = "PHP"): string {
  const safe = toFiniteCurrencyAmount(amount);
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(safe);
}

/**
 * Currency formatting safe for pdfkit built-in fonts (Helvetica), which only cover WinAnsi.
 * Avoids ₱ and other symbols that render as blanks in PDFs.
 */
export function formatCurrencyForPdf(amount: number, currency = "PHP"): string {
  const safe = toFiniteCurrencyAmount(amount);
  const amountStr = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
  const code = currency.trim().toUpperCase() || "PHP";
  if (code === "USD") return `$${amountStr}`;
  if (code === "EUR") return `EUR ${amountStr}`;
  if (code === "GBP") return `GBP ${amountStr}`;
  return `${code} ${amountStr}`;
}

/** Normalize text for pdfkit standard fonts (strip symbols outside WinAnsi). */
export function sanitizePdfText(text: string): string {
  return text
    .replace(/\u20B1/g, "PHP ")
    .replace(/\u2014/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/\u2212/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
}

/** Short currency labels for chart axes (uses app currency). */
export function formatCurrencyCompactAxis(amount: number, currency: string): string {
  const safe = toFiniteCurrencyAmount(amount);
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(safe);
  } catch {
    return formatCurrency(safe, currency);
  }
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDateTimeInTimezone(date: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(date));
}

export function formatDateInTimezone(date: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(new Date(date));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}
