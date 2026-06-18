import type { ProductCategory } from "@/types";

export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "homecare", label: "Home Care" },
  { value: "cosmetics", label: "Cosmetics" },
  { value: "wellness", label: "Health & Wellness" },
  { value: "scent", label: "Perfumes & Scents" },
];

export const PRODUCT_CATEGORY_COLORS: Record<ProductCategory, string> = {
  homecare: "bg-blue-100 text-blue-800",
  cosmetics: "bg-pink-100 text-pink-800",
  wellness: "bg-green-100 text-green-800",
  scent: "bg-purple-100 text-purple-800",
};

export const PRODUCTS_CSV_TEMPLATE =
  "sku,name,shortdescription,description,seotitle,seodescription,category,barcode,retailprice,isactive,marketplacelisted,tags\r\n" +
  "EX-SKU-001,Example Product,Short summary for listings.,Full product details here.,,," +
  "homecare,,12.99,true,true,demo\r\n";

const SKU_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}

/** Uppercase alphanumeric SKU, max length within API limits (e.g. 50). */
export function randomProductSku(): string {
  const bytes = randomBytes(8);
  let suffix = "";
  for (let i = 0; i < 8; i++) suffix += SKU_CHARS[bytes[i]! % SKU_CHARS.length]!;
  return `SKU-${suffix}`;
}

/** 13-digit EAN-13 with a valid check digit (works with typical scanners). */
export function randomEan13Barcode(): string {
  const bytes = randomBytes(12);
  let body = "";
  for (let i = 0; i < 12; i++) body += String(bytes[i]! % 10);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = body.charCodeAt(i) - 48;
    sum += i % 2 === 0 ? n : n * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return body + check;
}
