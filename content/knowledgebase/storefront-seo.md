---
slug: storefront-seo
title: Storefront SEO
summary: How the public online store is indexed—metadata, sitemap, robots, and what administrators configure in Settings.
category: administration
relatedPaths:
  - /settings
  - /products
  - /
permissionsNote: Application SEO fields and NEXT_PUBLIC_APP_URL are administrator / deployment concerns. Product SEO fields require manage:products.
---

## What is optimized

The **customer-facing storefront** (home, shop, product pages, about/contact, etc.) exposes:

- Page **titles** and **meta descriptions**
- **Canonical URLs** and Open Graph / Twitter cards
- **Product JSON-LD** (structured data) with stock-based availability
- **`/sitemap.xml`** — Static pages plus every marketplace-listed product
- **`/robots.txt`** — Allows the shop; blocks cart, checkout, account, API, and staff dashboard routes

Staff **Help** articles and the dashboard are **not** indexed (`noindex`).

## Administrator checklist

1. **Settings → Application → Storefront SEO**
   - Set **default meta description** (160 characters).
   - Optionally set **default social image** from the media library.
2. **Settings → Application** — Confirm **application name**, **tagline**, and **logo** (logo is used when no OG image is set).
3. **Deployment** — Set `NEXT_PUBLIC_APP_URL` to your production storefront origin (no trailing slash). Used for canonical links and the sitemap.
4. **Products** — For important SKUs, fill **SEO title** and **SEO meta description** on the product form; enable **List on marketplace** so the product appears in the shop and sitemap.
5. After go-live — Submit `/sitemap.xml` in Google Search Console; test a product URL with [Rich Results Test](https://search.google.com/test/rich-results).

## Per-product SEO

On **Products → edit**, optional fields override defaults:

| Field | Limit | Fallback |
|-------|-------|----------|
| SEO title | 70 chars | Product name + app name |
| SEO meta description | 160 chars | Short description |

Markdown in the description field is stored as Markdown; search engines receive **plain text**.

## Public vs private URLs

| Indexed (examples) | Not indexed |
|--------------------|-------------|
| `/`, `/shop`, `/product/{slug}` | `/cart`, `/checkout`, `/account` |
| `/about-us`, `/contact`, `/categories`, `/reviews` | `/pos`, `/products`, `/dashboard`, `/login`, `/help` |

## Developer reference

Technical file map, tests, and follow-up tasks: `docs/marketplace-seo.md` in the repository.

## Related

- [Settings](/help/settings) — Application tab
- [Products](/help/products) — Marketplace listing and SEO fields
- [Online store](/help/online-store) — Opening the storefront from the dashboard
