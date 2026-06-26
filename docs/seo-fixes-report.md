# SEO Priority Fixes — Implementation Report

**Project:** Glowish Marketplace
**Date:** 2026-06-26
**Author:** Claude Code (Sonnet 4.6)
**Scope:** All 5 items from the Marketplace SEO Priority Action List

---

## Summary

All five high-priority SEO issues identified in the Marketplace SEO audit have been resolved. The changes address server-side rendering for the home page, image accessibility, structured data, sitemap completeness, and environment configuration documentation.

---

## Fix 1 — Home Page Server-Side Rendering

**Issue:** `app/(marketplace)/page.tsx` was a `"use client"` component (606 lines). Search engine crawlers received an empty HTML shell with no metadata, no product listings, and no Open Graph tags.

**Impact:** The most-visited page was invisible to indexers. Title, description, and OG image were never rendered into the initial HTML response.

**Solution:** Split into two files:

### `app/(marketplace)/page.tsx` (new — server component)
- Exports `generateMetadata` with full title, description, and Open Graph fields
- Calls `listMarketplaceProducts({ page: 1, limit: 12 })` and `getMarketplaceCategoryShowcase()` in parallel via `Promise.allSettled`
- Passes results as props to `HomePageClient`
- Gracefully handles fetch failures — renders the page with empty initial state rather than throwing

### `app/(marketplace)/HomePageClient.tsx` (new — client component)
- Contains all original interactive logic: search, category filter, pagination, product grid, hero section, category cards, reviews carousel
- Accepts `initialProducts`, `initialMeta`, and `initialCategorySamples` props
- Uses a `skipNextLoad` ref so the first client-side `useEffect` does not re-fetch when server data is already present
- Replaces the `useCategorySampleImages` hook (which made an API call) with the `initialCategorySamples` prop passed from the server

**Before:**
```
GET / → empty <body> → crawler sees no content
```

**After:**
```
GET / → full SSR HTML with 12 products, metadata, OG tags → crawler indexes content
```

---

## Fix 2 — Empty Alt Attributes on Product Images

**Issue:** Product images across cart, checkout, wishlist, and shop used `alt=""`. Screen readers announced these as decorative, giving visually impaired users no information about the products shown.

**Files changed:**

| File | Location | Old | Fixed |
|------|----------|-----|-------|
| `app/(marketplace)/cart/page.tsx` | Cart line items (×2) | `alt=""` | `alt={line.name}` |
| `app/(marketplace)/cart/page.tsx` | Suggested products | `alt=""` | `alt={product.name}` |
| `app/(marketplace)/checkout/page.tsx` | Order summary line items (×2) | `alt=""` | `alt={line.name}` |
| `app/(marketplace)/account/wishlist/page.tsx` | Wishlist items (×2) | `alt=""` | `alt={item.name}` |
| `app/(marketplace)/shop/ShopPageClient.tsx` | `ProductImage` component (×2) | `alt=""` | `alt={product.name}` |
| `app/(marketplace)/shop/ShopPageClient.tsx` | Hero float images (×2) | `alt=""` | `alt={product.name}` |

All eight instances now carry the product name as the alt text, satisfying WCAG 2.1 SC 1.1.1 (Non-text Content) and the prior accessibility audit failure.

---

## Fix 3 — Individual Review Pages in Sitemap

**Issue:** `app/sitemap.ts` included static paths and product slugs but omitted `/reviews/[id]` URLs. Individual review pages were not being discovered or indexed by search engines.

**File changed:** `app/sitemap.ts`

**Change:** Added a call to `listPublicMarketplaceReviews({ limit: 100 })` alongside the existing product slug fetch. Each review is mapped to a sitemap entry:

```ts
{
  url: absoluteUrl(`/reviews/${review.id}`, siteUrl),
  lastModified: now,
  changeFrequency: "monthly",
  priority: 0.5,
}
```

The fetch is wrapped in `Promise.allSettled` so a reviews service failure does not break the entire sitemap generation. The service internally caps results at 100 per call.

---

## Fix 4 — FAQPage Structured Data (JSON-LD)

**Issue:** `app/(marketplace)/faqs/page.tsx` had no structured data. Search engines could not render FAQ rich results (expandable Q&A panels in SERPs) for the page.

**File changed:** `app/(marketplace)/faqs/page.tsx`

**Change:** Added a `FAQPage` JSON-LD script block rendered above the page content. The schema is built directly from the existing `FAQ_ITEMS` array so it stays in sync automatically:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How do I place an order?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Browse the shop, add items to your cart..."
      }
    },
    ...
  ]
}
```

Six questions are now eligible for FAQ rich results in Google Search.

---

## Fix 5 — NEXT_PUBLIC_APP_URL Marked as Required

**Issue:** `.env.example` had `NEXT_PUBLIC_APP_URL` commented out and described as optional. This variable controls canonical URLs, sitemap base URL, and all Open Graph image/URL tags. Deploying without it causes every canonical link, sitemap entry, and OG tag to fall back to `http://localhost:3000`.

**File changed:** `.env.example`

**Before:**
```env
# Canonical URLs, sitemap, and Open Graph (production storefront origin, no trailing slash)
# NEXT_PUBLIC_APP_URL=https://your-store.example.com
```

**After:**
```env
# REQUIRED for production — canonical URLs, sitemap, and Open Graph (no trailing slash)
NEXT_PUBLIC_APP_URL=https://your-store.example.com
```

The variable is now uncommented and prefixed with `REQUIRED` so it is not skipped during deployment setup.

---

## Files Changed

| File | Change Type |
|------|------------|
| `app/(marketplace)/page.tsx` | Rewritten — server component |
| `app/(marketplace)/HomePageClient.tsx` | New file — client component |
| `app/(marketplace)/cart/page.tsx` | Alt text fix (3 images) |
| `app/(marketplace)/checkout/page.tsx` | Alt text fix (2 images) |
| `app/(marketplace)/account/wishlist/page.tsx` | Alt text fix (2 images) |
| `app/(marketplace)/shop/ShopPageClient.tsx` | Alt text fix (4 images) |
| `app/sitemap.ts` | Added `/reviews/[id]` entries |
| `app/(marketplace)/faqs/page.tsx` | Added FAQPage JSON-LD |
| `.env.example` | Marked NEXT_PUBLIC_APP_URL as required |

---

## Verification Checklist

After deploying, confirm the following:

- [ ] `curl https://your-store.example.com/` returns product names and metadata in the raw HTML response (not an empty `<body>`)
- [ ] `<title>` and `<meta name="description">` are present in the home page HTML source
- [ ] `<meta property="og:title">` is populated on the home page
- [ ] Product images in cart and checkout are announced with product names in a screen reader
- [ ] `https://your-store.example.com/sitemap.xml` includes `/reviews/` entries
- [ ] `https://your-store.example.com/faqs` source contains `application/ld+json` with `FAQPage` type
- [ ] Google Rich Results Test passes for `/faqs`: https://search.google.com/test/rich-results
- [ ] `NEXT_PUBLIC_APP_URL` is set to the production domain in the deployment environment

---

## Notes

- The home page client component still fetches fresh data on filter/search/pagination changes — only the first load is skipped when server props are present.
- The reviews sitemap is capped at 100 entries by the service layer. If the review count grows beyond 100, the service limit should be raised or paginated sitemap generation should be introduced.
- The `FAQPage` schema is derived from `FAQ_ITEMS` at build time. Any new FAQ entries added to that array will automatically appear in the structured data on next deploy.
