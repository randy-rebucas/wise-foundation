/** J&T Express Philippines Open Platform API configuration. */

export function isJntConfigured(): boolean {
  return Boolean(
    process.env.JNT_API_ACCOUNT?.trim() &&
      process.env.JNT_PRIVATE_KEY?.trim() &&
      process.env.JNT_CUSTOMER_CODE?.trim() &&
      process.env.JNT_ORIGIN_NAME?.trim() &&
      process.env.JNT_ORIGIN_PHONE?.trim() &&
      process.env.JNT_ORIGIN_ADDRESS?.trim() &&
      process.env.JNT_ORIGIN_CITY?.trim()
  );
}

export function getJntApiBaseUrl(): string {
  return (
    process.env.JNT_API_BASE_URL?.trim() ||
    (process.env.JNT_USE_SANDBOX === "true"
      ? "https://demoopenapi.jtexpress.ph"
      : "https://api.jtexpress.ph")
  );
}

export function getJntCredentials() {
  const eccompanyid = process.env.JNT_API_ACCOUNT?.trim();
  const privateKey = process.env.JNT_PRIVATE_KEY?.trim();
  const customerid = process.env.JNT_CUSTOMER_CODE?.trim();
  if (!eccompanyid || !privateKey || !customerid) {
    throw new Error("J&T Express is not configured");
  }
  return { eccompanyid, privateKey, customerid };
}

export type JntOriginAddress = {
  name: string;
  phone: string;
  address: string;
  city: string;
  area: string;
};

export function getJntOrigin(): JntOriginAddress {
  const name = process.env.JNT_ORIGIN_NAME?.trim();
  const phone = process.env.JNT_ORIGIN_PHONE?.trim();
  const address = process.env.JNT_ORIGIN_ADDRESS?.trim();
  const city = process.env.JNT_ORIGIN_CITY?.trim();
  const area = process.env.JNT_ORIGIN_AREA?.trim() || city;
  if (!name || !phone || !address || !city) {
    throw new Error("J&T origin address is not configured");
  }
  return { name, phone, address, city, area: area ?? city };
}
