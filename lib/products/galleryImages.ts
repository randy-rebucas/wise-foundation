/** Normalize and dedupe image URLs while preserving order. */
export function dedupeImageUrls(urls: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = raw?.trim();
    if (url && !seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}

/**
 * Gallery for marketplace product detail.
 * Variant images come first when present; product images follow (deduped).
 * If the variant has no images, only product images are shown (cover = first product image).
 */
export function buildMarketplaceGalleryImages(
  productImages: readonly (string | null | undefined)[] | undefined,
  variantImages: readonly (string | null | undefined)[] | undefined
): string[] {
  const product = dedupeImageUrls(productImages ?? []);
  const variant = dedupeImageUrls(variantImages ?? []);
  if (variant.length === 0) return product;
  const seen = new Set(variant);
  const extra = product.filter((url) => !seen.has(url));
  return [...variant, ...extra];
}
