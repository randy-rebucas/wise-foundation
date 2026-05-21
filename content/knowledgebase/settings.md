---
slug: settings
title: Settings
summary: Profile, password, account details, and (for administrators) tenant branding, storefront SEO, and application defaults.
category: get-started
relatedPaths:
  - /settings
permissionsNote: The Application tab (logo, SEO, currency, marketplace fulfillment) is visible to platform ADMIN only. The Roles tab is visible to ADMIN or users with manage:roles.
---

## Tabs overview

| Tab | Who | Purpose |
|-----|-----|---------|
| **Profile** | Everyone | Name and phone |
| **Security** | Everyone | Change password |
| **Account** | Everyone | Read-only role, organization, branches, permissions |
| **Application** | ADMIN | Tenant branding, SEO, Cloudinary, currency, PO defaults, marketplace fulfillment |
| **Roles** | ADMIN (or permitted) | Compare and sync role permissions with code defaults |

## Profile & security

- **Profile** — Update display name and phone; email is read-only (contact an admin to change).
- **Security** — Change password (minimum 8 characters). Use **Sign out** in the sidebar on shared devices.

## Account (read-only)

Shows your **role**, **organization**, assigned **branches**, and extra **permissions**. Notification preferences are not configured in-app yet.

## Application (administrators)

Open **Settings → Application** to manage tenant-wide values used in the dashboard, POS, receipts, and **public online store**.

### Branding

- **Application logo** — Sidebar, login, marketplace header, receipts. Upload or pick from the **Media** library; reset to the default bundled logo when needed.
- **Application name** — Shown across the app and as the default storefront title.
- **Tagline** — Short line under the brand; also used as a fallback meta description when no SEO description is set.

### Storefront SEO

Controls how the **public shop** appears in search and social previews (see [Storefront SEO](/help/storefront-seo)).

- **Default meta description** (max 160 characters) — Site-wide description for home, shop, and other pages without custom copy.
- **Default social image (Open Graph)** — Preview image for link sharing; if empty, the app logo is used.

Per-product overrides live on the product edit form (**SEO** section).

### Operations & formatting

- **Currency** (ISO 4217) and **timezone** (IANA) — Amounts and dates across POS, reports, and checkout.
- **Default member discount %** — Pre-filled when registering members.
- **Default low-stock threshold** — Applied when new branch inventory rows are created.
- **Purchase order discounts by organization type** — Default % for distributor, franchise, partner, headquarters.
- **Marketplace fulfillment branch** — Branch whose inventory is deducted for **online orders** (defaults to head office).
- **Receipt footer** — Optional line on printed receipts.

### Image storage (Cloudinary)

The Application tab includes a **Cloudinary** status card. When configured, product and media uploads use Cloudinary; otherwise files go to `public/uploads`. Use **Test connection** after changing environment variables.

## Roles (administrators)

Visible when you are **ADMIN** or have the **`manage:roles`** permission. Compare database roles with code defaults and run **Sync roles** after permission changes in the codebase (`pnpm sync:roles`). See [Roles & permissions](/help/roles-permissions).

## Related

- [Storefront SEO](/help/storefront-seo) — Search, sitemap, and product metadata.
- [Products](/help/products) — Per-product SEO and marketplace listing.
- [Media library](/help/media) — Images for logos, products, and OG images.
- [Roles & permissions](/help/roles-permissions)
