import { stripMarkdownPlainText } from "@/lib/markdown/stripMarkdown";

/** Plain-text excerpt for cards, meta fallback, and listing snippets. */
export function resolveProductShortDescription(product: {
  shortDescription?: string | null;
  description?: string | null;
  seoDescription?: string | null;
}): string {
  const short = product.shortDescription?.trim();
  if (short) return stripMarkdownPlainText(short);
  const seo = product.seoDescription?.trim();
  if (seo) return stripMarkdownPlainText(seo);
  const full = product.description?.trim();
  if (!full) return "";
  const plain = stripMarkdownPlainText(full);
  if (plain.length <= 320) return plain;
  const slice = plain.slice(0, 317);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > 200 ? slice.slice(0, lastSpace) : slice).trim() + "…";
}

/** Raw Markdown for storefront display (short field, then SEO, then truncated full). */
export function resolveProductShortDescriptionMarkdown(product: {
  shortDescription?: string | null;
  description?: string | null;
  seoDescription?: string | null;
}): string {
  const short = product.shortDescription?.trim();
  if (short) return short;
  const seo = product.seoDescription?.trim();
  if (seo) return seo;
  const full = product.description?.trim();
  if (!full) return "";
  if (full.length <= 500) return full;
  return `${full.slice(0, 497).trim()}…`;
}
