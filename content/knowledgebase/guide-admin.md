---
slug: guide-admin
title: "Complete guide: Administrator (ADMIN)"
summary: Full walkthrough for platform administrators—tenant oversight, branches, organizations, catalog, and system settings.
category: user-journeys
relatedPaths:
  - /dashboard
  - /admin/branches
  - /admin/organizations
  - /admin/users
  - /settings
permissionsNote: ADMIN bypasses all permission checks (see isPlatformAdmin in lib/permissions.ts). This is the only role with unrestricted access across every branch and organization.
journeys:
  - id: admin-daily
    title: Administrator—daily oversight
    audience: ADMIN
    description: A repeatable loop for keeping the tenant healthy.
    steps:
      - title: Dashboard KPIs
        description: Sales, members, and alerts at a glance.
        href: /dashboard
      - title: Branches & users
        description: Confirm branches exist and staff accounts are active.
        href: /admin/branches
      - title: Organizations
        description: Audit distributor, franchise, and partner records.
        href: /admin/organizations
      - title: Reviews, ads, blog
        description: Moderate storefront content.
        href: /admin/reviews
      - title: Backup
        description: Verify recent backups exist.
        href: /admin/backup
---

## Who this is for

You are the **platform operator**—HQ staff with full tenant access. You are the only role that bypasses every permission check (`isPlatformAdmin`), so anything documented anywhere in this help center is available to you. This guide focuses on what only ADMIN can do and the order to check things in.

## What you can access

Everything in the sidebar. Notably, these are **ADMIN-only** screens:

| Area | Path | Purpose |
|------|------|---------|
| Dashboard | `/dashboard` | Tenant-wide KPIs |
| Organizations | `/admin/organizations` | Create/edit distributor, franchise, partner, HQ orgs |
| Users | `/admin/users` | All user accounts, any role |
| Reviews | `/admin/reviews` | Moderate and feature storefront reviews |
| Ads | `/admin/ads` | Storefront ad placements |
| Blog | `/admin/blog` | Blog posts |
| Spin Wheel | `/admin/spin-wheel` | Promotions/spin-to-win config |
| Backup & Restore | `/admin/backup` | Database backup, restore, transfer |
| Audit Log | `/admin/audit-logs` | System-wide activity trail |
| Settings → Application | `/settings` | Branding, SEO, currency, Cloudinary, PO defaults |
| Settings → Roles | `/settings` | Sync role permission defaults with code |

You also have full access to Branches, Products, Inventory, Media, Purchase Orders, Orders, Deliveries, Reseller Sales, Commissions, Members, and Reports—every module documented elsewhere in this help center applies to you without restriction.

## First-time setup checklist

If you're standing up a new tenant:

1. **Settings → Application** — set application name, logo, currency, timezone, and SEO defaults. See [Settings](/help/settings).
2. **Branches** — create at least one branch before adding inventory or running POS. See [Branches](/help/admin-branches).
3. **Users** — create staff accounts and assign roles/branches. See [Users & team](/help/admin-users-team).
4. **Organizations** (if you work with distributors/franchises/partners) — create org records and set capability flags (POS, inventory, commissions, order submission). See [Organizations](/help/admin-organizations).
5. **Products** — build the catalog before opening POS or the storefront. See [Products](/help/products).
6. **Storefront SEO** — confirm sitemap and meta defaults if the public shop is live. See [Storefront SEO](/help/storefront-seo).

## Daily/weekly loop

1. **Dashboard** — scan sales, low stock, and pending-order counts.
2. **Branches & Users** (`/admin/branches`, `/admin/users`) — confirm nothing is broken (inactive branch, locked-out user).
3. **Organizations** — check for distributor/partner requests needing attention (new orgs, capability changes).
4. **Deliveries** — HQ fulfillment queue for approved purchase orders is ADMIN-only; see [Deliveries](/help/deliveries).
5. **Reports** — period-close numbers.
6. **Reviews / Ads / Blog** — moderate new storefront content if the marketplace is customer-facing.
7. **Backup & Restore** — periodically confirm backups are current; use before risky operations. See below.

## Backup & restore

`/admin/backup` lets you create, preview, download, and restore database backups, and transfer them between environments. This is the only role that can reach this screen. Treat restore as destructive—confirm you have a fresh backup before restoring an older one.

## Roles & permissions administration

`Settings → Roles` compares the database's stored role-permission grants against the code defaults in `lib/permissions.ts` and lets you **Sync roles** after a deploy that changed permission keys (`pnpm sync:roles`). Use this whenever a developer adds a new permission key so existing users pick it up. Full role/permission matrix: [Roles & permissions](/help/roles-permissions).

## Organization capability flags

Under **Organizations**, each org record has flags independent of user roles: retail selling, distribution, inventory surface, commissions, and order submission. These flags—not just the ORG_ADMIN role—determine what an organization's users see in **My Panel** and the sidebar (e.g., POS only shows for org users if `posSurface` is `branch`).

## If a user reports "forbidden" or a missing menu item

1. Check their **role** and **extra permissions** on `/admin/users`.
2. Check their **assigned branches** (branch-scoped roles only see their branches).
3. If they're org-bound, check the **organization's capability flags**.
4. Compare against [Roles & permissions](/help/roles-permissions) and [User journeys](/help/user-journeys) for what their role should see.

## Related guides

- [Roles & permissions](/help/roles-permissions) — full permission matrix
- [User journeys](/help/user-journeys) — every role's happy path
- [Settings](/help/settings) — Application tab detail
- [Storefront SEO](/help/storefront-seo)
