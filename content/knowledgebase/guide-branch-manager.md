---
slug: guide-branch-manager
title: "Complete guide: Branch manager (BRANCH_MANAGER)"
summary: Full walkthrough for branch supervisors—POS oversight, inventory, orders, members, and reports for assigned branches.
category: user-journeys
relatedPaths:
  - /pos
  - /orders
  - /inventory
  - /members
permissionsNote: "BRANCH_MANAGER default permissions: manage:products, manage:inventory, use:pos, view:reports, manage:members, manage:orders. Data is scoped to branches assigned to your user record."
journeys:
  - id: branch-manager-daily
    title: Branch manager—daily run
    audience: BRANCH_MANAGER
    description: Keep the branch trading with accurate stock and staff coverage.
    steps:
      - title: POS oversight
        description: Confirm staff can check out correctly.
        href: /pos
      - title: Orders
        description: Handle exceptions, pickups, follow-ups.
        href: /orders
      - title: Inventory checks
        description: Investigate low stock, coordinate transfers.
        href: /inventory
      - title: Members
        description: Onboard or update member profiles.
        href: /members
---

## Who this is for

You supervise one or more **branches**. Your access covers products, inventory, POS, orders, members, and reports—but only for branches assigned to your user account, not the whole tenant.

## What you can access

| Area | Path | Notes |
|------|------|-------|
| Products | `/products` | Catalog for your branches |
| Media | `/media` | Product images |
| Inventory | `/inventory` | Stock levels, adjustments, transfers |
| Purchase Orders | `/purchase-orders` | If your branch submits/receives inbound stock |
| POS | `/pos` | Ring up sales |
| Orders | `/orders` | Branch orders |
| Members | `/members` | Loyalty member records |
| Reports | `/reports` | Branch-scoped |
| Settings | `/settings` | Profile, security, read-only account |

You do **not** see Dashboard, Org Dashboard/My Panel, Organizations, Users (tenant-wide), Reviews, Ads, Blog, Backup, or Audit Log.

## Daily loop

1. **POS** — make sure the till/checkout is working before opening; correct any pricing or member-pricing issues.
2. **Orders** — work through exceptions: pickups, unpaid, or flagged orders.
3. **Inventory** — check low-stock alerts; coordinate transfers between branches or draft a purchase order if HQ replenishment is needed.
4. **Members** — onboard new members and correct existing profiles used at checkout for pricing/loyalty.
5. **Reports** — spot-check sales and stock trends for your branch.

## Running POS

Confirm the correct **branch** context if your account has more than one. Ensure product prices reflect member-tier pricing when applicable. Full checkout flow: [POS](/help/pos).

## Inventory & purchase orders

Use **Inventory** to adjust levels and investigate variances. If stock needs to come from HQ, draft a **Purchase Order**—workflow is **draft → submitted → approved → received**. You can create, submit, and receive; approval is an HQ ADMIN action. Detail: [Inventory](/help/inventory), [Purchase orders](/help/purchase-orders).

## Members

Add or update member records used for pricing/loyalty at POS checkout. See [Members](/help/members).

## Training staff

As a branch manager you're typically the point of contact for **STAFF** accounts at your branch—use the [Staff guide](/help/guide-staff) as onboarding material and confirm new hires can complete a standard checkout before their first shift alone.

## If something is missing

- Can't see a screen → it likely requires an ADMIN or ORG_ADMIN-only route (Organizations, Users, Backup, etc.)—that's expected.
- Inventory or orders show fewer items than expected → confirm which branches are assigned to your account in **Settings → Account**.

## Related guides

- [POS](/help/pos)
- [Inventory](/help/inventory)
- [Orders](/help/orders)
- [Members](/help/members)
- [Roles & permissions](/help/roles-permissions)
