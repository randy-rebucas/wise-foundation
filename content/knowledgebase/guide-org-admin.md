---
slug: guide-org-admin
title: "Complete guide: Organization admin (ORG_ADMIN)"
summary: Full walkthrough for distributor, franchise, and partner leads—Org Dashboard, My Panel, POS, and reseller flows by org type.
category: user-journeys
relatedPaths:
  - /org-dashboard
  - /org-panel
  - /pos
  - /reseller-sales
  - /commissions
permissionsNote: "ORG_ADMIN default permissions: manage:organizations, manage:users, manage:inventory, use:pos, manage:orders, view:reports, submit:org_orders, view:org_inventory, view:org_commissions. All data is scoped to your organizationId."
journeys:
  - id: org-admin-onboarding
    title: Org admin—first login
    audience: ORG_ADMIN
    description: Get oriented before your first working day.
    steps:
      - title: Org Dashboard
        description: See your organization's KPIs.
        href: /org-dashboard
      - title: My Panel
        description: Find your type-specific workspace.
        href: /org-panel
      - title: Team
        description: Add or check staff under your organization.
        href: /admin/users
      - title: Settings → Account
        description: Confirm your organization and capability flags.
        href: /settings
---

## Who this is for

You lead a **distributor, franchise, partner, or headquarters** organization. Everything you see is scoped to your `organizationId`—not the whole tenant. Which screens matter most depends on your **organization type**, set by the platform ADMIN.

## What you can access

| Area | Path | Notes |
|------|------|-------|
| Org Dashboard | `/org-dashboard` | Your organization's KPIs |
| My Panel | `/org-panel` | Type-specific workspace (see below) |
| Team | `/admin/users` | Manage users within your organization |
| Products, Media | `/products`, `/media` | If your org has catalog access |
| Inventory | `/inventory` | If `inventorySurface` is enabled for your org |
| Purchase Orders | `/purchase-orders` | Submit orders to HQ (`submit:org_orders`) |
| Orders | `/orders` | Organization-scoped |
| Reseller Sales | `/reseller-sales` | Record community/off-system sales |
| Commissions | `/commissions` | Track earned/pending/paid |
| Reports | `/reports` | Organization-scoped |
| POS | `/pos` | Only if `posSurface` is `branch` for your org |
| Settings | `/settings` | Profile, security, read-only account info |

You do **not** see: platform Dashboard, admin Organizations/Users (tenant-wide), Reviews, Ads, Blog, Spin Wheel, Backup, or Audit Log—those are ADMIN-only.

## My Panel by organization type

Your organization's **type** changes what My Panel emphasizes:

### Distributor / headquarters
- **Organization inventory** table with low-stock highlights.
- **B2B orders**: move through **pending → approved → paid**, or cancel invalid ones.
- Journey: Org Dashboard → My Panel → approve/cancel pending → mark paid once payment confirmed.

### Franchise
- KPIs from recent orders, plus quick links to **Reseller Sales** and **Commissions**.
- Use **POS** for in-store counter sales; use **Reseller Sales** for community-style capture that isn't run through POS.

### Partner
- **Commission earned / pending payout / paid out** summaries.
- **Recent orders** and **commission history**, linking to full [Commissions](/help/commissions).
- Journey: My Panel → Reseller Sales (ensure commission-generating sales are captured) → Commissions → Reports.

## Daily loop

1. **Org Dashboard** — scan revenue, pending B2B work, inventory signals.
2. **My Panel** — work the type-specific queue (approve B2B orders, log reseller sales, or reconcile commissions).
3. **Purchase Orders** — if you're a distributor drawing stock from HQ, draft/submit/track orders. Workflow: **draft → submitted → approved → received**, or **declined/cancelled**.
4. **Reports** — check organization-scoped numbers before period close.

## Purchase orders as a distributor

You can create and edit draft POs, sign and submit them for approval, and mark them received once stock arrives (all scoped to your organization). You **cannot** approve or decline your own POs—that's HQ's job. You will not see **Deliveries** in the sidebar; that's the HQ ADMIN fulfillment queue. Full detail: [Purchase orders](/help/purchase-orders).

## Team management

`Admin → Team` (same route as platform Users, but filtered to your org) lets you add staff and assign roles within your organization, if you have `manage:users`.

## If something is missing

- No **POS** link → your organization's `posSurface` capability is not `branch`. Ask the platform ADMIN.
- No **Inventory** link → your organization's `inventorySurface` capability is `none`.
- Data looks incomplete → confirm you're comparing against your own organization, not HQ-wide figures; ORG_ADMIN never sees other organizations' data.

## Related guides

- [My Panel](/help/org-panel)
- [Org Dashboard](/help/org-dashboard)
- [Purchase orders](/help/purchase-orders)
- [Commissions](/help/commissions)
- [Reseller sales](/help/reseller-sales)
- [Roles & permissions](/help/roles-permissions)
