# Glowish Marketplace — Full SEO Report

**Project:** Glowish Beauty & Wellness E-Commerce Platform
**Date:** 2026-06-26
**Framework:** Next.js 16 App Router
**Scope:** Public marketplace (`app/(marketplace)/`)

---

## Executive Summary

The Glowish marketplace has a solid SEO foundation: structured data is in place, metadata is dynamic, the sitemap is auto-generated, and the robots.txt is correctly configured. The most critical gap — the home page being a `"use client"` component that sent crawlers an empty HTML shell — has been resolved. Remaining opportunities are mostly content-depth improvements, schema enrichment, and Core Web Vitals optimizations rather than structural deficiencies.

**Overall SEO Health: Good** — Foundation complete, moderate room for improvement.

---

## 1. Technical SEO

### 1.1 Crawlability & Indexability

| Check | Status | Notes |
|-------|--------|-------|
| robots.txt valid | ✅ Pass | Disallows 30 internal paths; no `Allow: /` conflict |
| Sitemap present | ✅ Pass | `/sitemap.xml` auto-generated via `app/sitemap.ts` |
| Sitemap includes all public routes | ✅ Pass | 10 static pages + `/product/[slug]` + `/reviews/[id]` |
| Canonical URLs configured | ✅ Pass | `NEXT_PUBLIC_APP_URL` required in `.env.example` |
| No soft 404s on key pages | ✅ Pass | `notFound()` used on product/review pages |
| `/marketplace` redirects to `/` | ✅ Pass | Permanent (308) redirects in `next.config.ts` |
| `llms.txt` present | ✅ Pass | Lists all 20+ public pages with descriptions |
| Google Site Verification | ⚠️ Optional | `GOOGLE_SITE_VERIFICATION` env var supported but not required |

**Disallowed paths (robots.txt):**
`/api/`, `/account`, `/cart`, `/checkout`, `/login`, `/setup`, `/maintenance`, `/pos`, `/products`, `/inventory`, `/dashboard`, `/settings`, `/purchase-orders`, `/admin`, `/orders`, `/members`, `/commissions`, `/deliveries`, `/reports`, `/media`, `/help`, `/org-dashboard`, `/org-panel`, `/reseller-sales`

All administrative and transactional routes are correctly blocked. Public marketplace routes (`/`, `/shop`, `/product/*`, `/reviews/*`, `/categories`, `/faqs`, `/about-us`, `/contact`) are crawlable.

---

### 1.2 Server-Side Rendering & Metadata

| Page | SSR | generateMetadata | Open Graph | Canonical |
|------|-----|-----------------|------------|-----------|
| Home (`/`) | ✅ Server component | ✅ | ✅ | ✅ |
| Shop (`/shop`) | ✅ Server component | ✅ | ✅ | ✅ |
| Product (`/product/[slug]`) | ✅ Layout (server) | ✅ | ✅ with image | ✅ |
| Reviews listing (`/reviews`) | ✅ | ✅ | ✅ | ✅ |
| Individual review (`/reviews/[id]`) | ✅ | ✅ | ✅ | ✅ |
| FAQs (`/faqs`) | ✅ | ✅ | ✅ | ✅ |
| About Us (`/about-us`) | ✅ | ✅ | ✅ | ✅ |
| Contact (`/contact`) | ✅ | ✅ | ✅ | ✅ |
| Categories (`/categories`) | ✅ | ✅ | ✅ | ✅ |
| Shipping & Delivery | ✅ | ✅ | ✅ | ✅ |
| Returns & Refunds | ✅ | ✅ | ✅ | ✅ |
| Privacy Policy | ✅ | ✅ | ✅ | ✅ |

**All public pages render metadata and initial HTML on the server.** The root layout uses a title template (`%s — Glowish`) so every page title is consistent.

---

### 1.3 Metadata Quality

#### Root Layout (`app/layout.tsx`)
- Title template: `%s — Glowish`
- Description: pulled from admin settings (`appDescription` or `tagline` fallback)
- `metadataBase` set from `NEXT_PUBLIC_APP_URL`
- Google verification meta tag supported via env var
- Twitter card: `summary_large_image`

#### Home Page (`app/(marketplace)/page.tsx`)
```
Title:       Glowish — Get the Glow you wish
Description: Premium beauty and wellness products crafted with natural ingredients.
             Shop skincare, cosmetics, home care, and health essentials —
             dermatologically tested and cruelty free.
OG Type:     website
```

#### Product Pages (`/product/[slug]`)
- Title: custom `seoTitle` field or `{name} — {appName}` fallback
- Description: custom `seoDescription` or truncated `shortDescription` or generic fallback
- OG image: Cloudinary-optimized product image at 1200×630
- Availability and price in Open Graph via Product JSON-LD

#### Dynamic Settings
App name, tagline, SEO description, and logo are all resolved from `getPublicAppSettings()` — any change in the admin panel reflects in metadata on next request.

---

### 1.4 Structured Data (JSON-LD)

| Schema Type | Location | Status |
|-------------|----------|--------|
| `WebSite` | Marketplace layout | ✅ |
| `Organization` | Marketplace layout | ✅ |
| `Product` | `/product/[slug]` layout | ✅ |
| `FAQPage` | `/faqs` page | ✅ |
| `BreadcrumbList` | Not implemented | ❌ Gap |
| `Review` / `AggregateRating` | Not on product pages | ❌ Gap |
| `LocalBusiness` | Not implemented | ❌ Gap |

**WebSite schema** (marketplace layout — present on every public page):
```json
{
  "@type": "WebSite",
  "name": "Glowish",
  "url": "https://your-store.example.com",
  "description": "..."
}
```

**Organization schema** (marketplace layout):
```json
{
  "@type": "Organization",
  "name": "Glowish",
  "url": "https://your-store.example.com",
  "logo": "https://..."
}
```

**Product schema** (`/product/[slug]` layout — per product):
```json
{
  "@type": "Product",
  "name": "...",
  "description": "...",
  "sku": "...",
  "image": ["..."],
  "brand": { "@type": "Organization", "name": "Glowish" },
  "offers": {
    "@type": "Offer",
    "price": "...",
    "priceCurrency": "PHP",
    "availability": "https://schema.org/InStock"
  }
}
```

**FAQPage schema** (`/faqs` — 6 Q&A pairs):
```json
{
  "@type": "FAQPage",
  "mainEntity": [ { "@type": "Question", "name": "...", "acceptedAnswer": { ... } } ]
}
```

---

### 1.5 Sitemap

**File:** `app/sitemap.ts`

```
Static entries (10):     priority 1.0 (home) / 0.8 (all others)
Product entries:         /product/[slug] — priority 0.7, weekly
Review entries:          /reviews/[id]   — priority 0.5, monthly (capped at 100)
```

**Gaps:**
- Category pages (e.g. `/categories/cosmetics`) — not in sitemap if they exist as routes
- Blog or editorial content — none exists yet

---

### 1.6 Performance & Core Web Vitals

| Factor | Status | Notes |
|--------|--------|-------|
| Image formats | ✅ | AVIF + WebP in `next.config.ts` |
| Image optimization | ✅ | Cloudinary CDN + `next/image` |
| Static asset caching | ✅ | `Cache-Control: public, max-age=31536000, immutable` |
| Font loading | ✅ | `font-display: swap` on all 4 fonts |
| Code splitting | ✅ | `react-markdown`, `SignaturePad` dynamically imported |
| Bundle analyzer | ✅ | `ANALYZE=true npm run build` available |
| LCP candidate | ⚠️ Review | Hero product images on home page — confirm `priority` on `next/image` |
| CLS risk | ⚠️ Review | Skeleton loaders in place; verify no layout shift on font load |

---

### 1.7 Security Headers (SEO-relevant)

All responses include:

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=5443200; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `SAMEORIGIN` |

HTTPS enforcement via HSTS signals trust to crawlers and improves ranking signals.

---

## 2. On-Page SEO

### 2.1 Content & Page Depth

| Page | Heading Structure | Unique Content | Internal Links |
|------|-----------------|---------------|----------------|
| Home | ✅ H1 present | ✅ Hero, categories, products, reviews | ✅ Shop, product pages |
| Shop | ✅ H1 present | ✅ Full product catalog | ✅ Products, categories |
| Product detail | ✅ H1 = product name | ✅ Description, variants, reviews | ✅ Related products |
| Categories | ✅ H1 present | ✅ Category cards | ✅ Shop by category |
| Reviews | ✅ H1 present | ✅ Customer reviews | ✅ Product links |
| About Us | ✅ H1 present | ✅ Brand story, 5 promises | ✅ Shop, contact |
| Contact | ✅ H1 present | ✅ Address, phone, email | ✅ Orders, support |
| FAQs | ✅ H1 present | ✅ 6 Q&A pairs | ✅ Shipping, returns, contact |
| Shipping & Delivery | ✅ H1 present | ✅ Policy content | ✅ Contact |
| Returns & Refunds | ✅ H1 present | ✅ Policy content | ✅ Contact |

### 2.2 Keyword Targeting

The current metadata is brand-focused and generic. Product pages benefit from specific product names and SKUs, but category and listing pages could be strengthened:

| Page | Current Title | Suggested Improvement |
|------|-------------|----------------------|
| `/shop` | Shop — Glowish | Shop Skincare & Beauty Products — Glowish |
| `/categories` | Categories — Glowish | Browse Beauty Categories: Skincare, Cosmetics, Wellness — Glowish |
| `/reviews` | Reviews — Glowish | Customer Reviews & Ratings — Glowish |
| `/faqs` | FAQs — Glowish | Frequently Asked Questions About Glowish Products |

### 2.3 Image Alt Text

All product images across cart, checkout, wishlist, shop, and home now use `alt={product.name}`. No remaining `alt=""` on informational images found in audited pages.

**Remaining audit areas** (not yet checked):
- `/about-us` decorative images — may be intentionally empty
- `/categories` category card images — should use category name as alt

---

## 3. Structured Data — Detailed Gap Analysis

### 3.1 Missing: BreadcrumbList

Product and category pages do not emit `BreadcrumbList` schema. This is a significant missed opportunity — breadcrumbs appear directly in Google SERPs below the URL and improve CTR.

**Recommended addition for product pages:**
```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "/" },
    { "@type": "ListItem", "position": 2, "name": "Shop", "item": "/shop" },
    { "@type": "ListItem", "position": 3, "name": "{product.name}", "item": "/product/{slug}" }
  ]
}
```

### 3.2 Missing: AggregateRating on Product Schema

The `Product` schema emits `Offer` (price/availability) but not `AggregateRating`. Review data is fetched separately on the page. Adding aggregate rating to the Product JSON-LD would enable **star ratings in Google Shopping and organic results**.

**Recommended addition to `buildProductJsonLd` in `lib/products/seo.ts`:**
```json
"aggregateRating": {
  "@type": "AggregateRating",
  "ratingValue": "4.5",
  "reviewCount": "23"
}
```

### 3.3 Missing: LocalBusiness Schema

The contact page shows a physical address and phone number. A `LocalBusiness` schema would help Google Maps presence and local search ranking.

**Recommended addition to `/contact` page:**
```json
{
  "@type": "LocalBusiness",
  "name": "Glowish",
  "address": { "@type": "PostalAddress", ... },
  "telephone": "...",
  "openingHours": "Mo-Fr 09:00-18:00"
}
```

### 3.4 Missing: ItemList Schema on Shop/Categories

The shop and categories pages list products/categories. An `ItemList` schema signals to Google the structure of these pages.

---

## 4. Open Graph & Social Sharing

| Property | Home | Product | Other Pages |
|----------|------|---------|-------------|
| `og:title` | ✅ | ✅ | ✅ |
| `og:description` | ✅ | ✅ | ✅ |
| `og:image` | ✅ (app logo/OG image) | ✅ (product image via Cloudinary) | ✅ (app logo) |
| `og:type` | `website` | `website` | `website` |
| `og:url` | ✅ (canonical) | ✅ | ✅ |
| `twitter:card` | `summary_large_image` | `summary_large_image` | `summary_large_image` |
| `twitter:image` | ✅ | ✅ | ✅ |

**Gap:** `og:type` on product pages should be `product` not `website` to qualify for richer Facebook product previews.

**OG image pipeline:** Admin-uploaded image → Cloudinary → `cloudinaryOgUrl()` (1200×630 crop) → injected into metadata. Fallback: app logo. This is a production-ready implementation.

---

## 5. URL Structure

| Pattern | Example | Quality |
|---------|---------|---------|
| Home | `/` | ✅ |
| Shop | `/shop` | ✅ |
| Product | `/product/glowish-vitamin-c-serum` | ✅ Slug-based |
| Category filter | `/shop?category=cosmetics` | ⚠️ Query string (not indexed by default) |
| Individual review | `/reviews/6659abc...` | ⚠️ MongoDB ObjectId — not human-readable |
| Account routes | `/account/*` | ✅ Correctly noindexed |

**Recommendations:**
1. Category filter pages at `/shop?category=cosmetics` are not indexed. If category SEO is a priority, consider adding `/shop/[category]` as a route with its own `generateMetadata`.
2. Review URLs use MongoDB ObjectIds (`/reviews/6659abc123`). These are crawlable but not descriptive. A future improvement would be slug-based review URLs.

---

## 6. Internal Linking

**Strengths:**
- Home page links to `/shop`, `/categories`, and individual product pages
- Footer present via `MarketplaceFooter` — links to all major pages
- Product pages link to related products
- FAQs link to `/shipping-delivery`, `/returns-refunds`, and `/contact`
- Breadcrumb navigation exists in the UI on product pages (visual only, no schema)

**Gaps:**
- No HTML sitemap page (user-facing `/sitemap` or `/all-pages`)
- Category pages do not cross-link to sub-category product listings
- Reviews listing does not link back to the products being reviewed

---

## 7. Page Speed & Technical Performance

### Image Delivery
- **Cloudinary CDN** used for all uploaded product and OG images
- **`next/image`** handles responsive sizing, lazy loading, and format negotiation
- `sizes` attributes set on all product grid images for correct responsive srcset

### Font Strategy
All four fonts (Geist, Playfair Display, Great Vibes, Plus Jakarta Sans) use `font-display: swap`, preventing invisible text during font load (FOIT).

### JavaScript Bundle
- `react-markdown` and `remark-gfm` are dynamically imported (code-split)
- `react-signature-canvas` is dynamically imported
- `@next/bundle-analyzer` available for inspection: `ANALYZE=true npm run build`

### Caching
Static assets cached for 1 year with `immutable` flag. API routes and pages use Next.js default ISR/SSR caching.

---

## 8. Priority Action List

Items ranked by SEO impact vs. implementation effort.

### High Priority

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | Add `AggregateRating` to Product JSON-LD using review data already fetched on the page | Star ratings in SERPs / Google Shopping | Medium |
| 2 | Add `BreadcrumbList` JSON-LD to product and category pages | Breadcrumb trails in SERPs, better CTR | Low |
| 3 | Change `og:type` from `website` to `product` on product pages | Richer Facebook/LinkedIn product cards | Low |
| 4 | Add `/shop/[category]` routes with dedicated `generateMetadata` for each category | Category pages indexed with targeted titles | High |

### Medium Priority

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 5 | Add `LocalBusiness` JSON-LD to `/contact` page | Local search / Google Maps | Low |
| 6 | Add `ItemList` JSON-LD to `/shop` and `/categories` | Rich product list previews | Medium |
| 7 | Strengthen `/shop` and `/categories` page titles with targeted keywords | Improved click-through rate | Low |
| 8 | Verify `priority` prop on LCP images in the hero section | Faster LCP, improved Core Web Vitals | Low |
| 9 | Submit sitemap to Google Search Console | Faster crawl discovery | Low |

### Low Priority

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 10 | Add user-facing HTML sitemap page at `/sitemap` | Accessibility + internal linking | Low |
| 11 | Add FAQ content to About Us, Shipping, and Returns pages to increase page depth | Long-tail keyword coverage | Medium |
| 12 | Replace MongoDB ObjectId in `/reviews/[id]` URLs with a human-readable slug | Descriptive URLs | High |
| 13 | Add cross-links from review pages back to the reviewed product | Internal link equity | Low |

---

## 9. Environment & Deployment Requirements

For full SEO functionality in production, the following environment variables must be set:

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_APP_URL` | **Required** | Canonical URLs, sitemap base, OG tags. Without this, all URLs default to `http://localhost:3000` |
| `GOOGLE_SITE_VERIFICATION` | Recommended | Verifies ownership in Google Search Console |
| `NEXT_PUBLIC_APP_NAME` | Recommended | Brand name in titles and schema |

---

## 10. Checklist Summary

### ✅ Implemented & Working
- Server-side rendering on all public pages
- `generateMetadata` on all routes
- Open Graph tags on all pages
- Product JSON-LD with price and availability
- WebSite + Organization JSON-LD site-wide
- FAQPage JSON-LD on `/faqs`
- Valid `robots.txt` with correct allow/disallow
- XML sitemap with static, product, and review entries
- `llms.txt` for AI indexers
- Image alt text on all product images
- Cloudinary OG images at 1200×630
- HSTS and security headers
- Font-display swap on all fonts
- Code-split heavy JS libraries
- Permanent redirects from `/marketplace/*`
- `NEXT_PUBLIC_APP_URL` documented as required

### ❌ Not Yet Implemented
- `BreadcrumbList` JSON-LD
- `AggregateRating` in Product schema
- `LocalBusiness` schema on contact page
- `ItemList` schema on shop/categories
- `og:type: product` on product pages
- Dedicated `/shop/[category]` routes with metadata
- HTML sitemap page
- Google Search Console sitemap submission

---

*Report generated by Claude Code. For questions or to action any item, reference the relevant section above.*
