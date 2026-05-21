---
slug: media
title: Media library
summary: Central image library for product photos, application logo, and storefront social preview images.
category: catalog-stock
relatedPaths:
  - /media
  - /products
  - /settings
permissionsNote: manage:products
---

## Purpose

**Media** stores reusable images (Cloudinary or local disk, depending on deployment). Use it to:

- Upload assets once and attach them to **products**
- Pick images for the **application logo** and **default OG image** in Settings → Application
- Avoid duplicating files across product records

## Access

Sidebar → **Media** (same permission as **Products**: `manage:products`).

## Uploading

- Drag and drop or select files (PNG/JPEG; size limits apply per deployment).
- If upload is disabled, configure **Cloudinary** or local `UPLOAD_DIR` — administrators can check status under **Settings → Application**.

## Using images elsewhere

| Destination | How to attach |
|-------------|----------------|
| Product gallery | Product edit form or media picker on products |
| App logo | Settings → Application → logo upload / media library |
| Storefront OG image | Settings → Application → Storefront SEO → Choose from media |

## Hygiene

- Prefer square product images for consistent cards in POS and the online store.
- Remove unused assets when safe — check **usage** hints in the media UI before deleting linked files.

## Related

- [Products](/help/products)
- [Settings](/help/settings)
- [Storefront SEO](/help/storefront-seo)
