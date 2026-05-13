/** Whether `Intl` can format currency with this ISO 4217 code. */
export function isValidCurrencyCode(code: string): boolean {
  const c = code.trim().toUpperCase();
  if (c.length < 3 || c.length > 10) return false;
  try {
    new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(0);
    return true;
  } catch {
    return false;
  }
}

/** Whether the string is a valid IANA timezone for `Intl` (e.g. Asia/Manila). */
export function isValidIanaTimezone(timeZone: string): boolean {
  const tz = timeZone.trim();
  if (!tz) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
