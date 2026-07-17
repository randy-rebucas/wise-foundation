---
slug: guide-member
title: "Complete guide: Member (MEMBER)"
summary: Full walkthrough for loyalty members with limited dashboard access—signing in and viewing your own orders.
category: user-journeys
relatedPaths:
  - /login
  - /orders
permissionsNote: "MEMBER default permissions: view:own_orders only. Not a full dashboard user—most sidebar links are hidden."
journeys:
  - id: member-self-service
    title: Member—self-service
    audience: MEMBER
    description: Limited self-service where enabled by your tenant.
    steps:
      - title: Sign in
        description: Use credentials from your sponsor organization or the branch that registered you.
        href: /login
      - title: Own orders
        description: View history or statuses your tenant exposes.
        href: /orders
---

## Who this is for

You're a **loyalty member**, not staff. Your account is used at checkout for member pricing and loyalty tracking, and it gives you limited self-service access if your tenant enables it.

## What you can access

Your permission set is just `view:own_orders`. In practice this means:

| Area | Path | Notes |
|------|------|-------|
| Sign in | `/login` | Use the credentials issued when you were registered |
| Orders | `/orders` | Your own order history/status only—never other members' orders |

Almost everything else in the sidebar (Products, Inventory, POS, Members, Reports, admin screens) is **hidden**—the sidebar's default rule shows a link only if you have its permission, and you have none of those.

## What you cannot do

- You cannot ring up sales, edit products, or manage other members.
- You cannot see tenant-wide or branch-wide data—only records tied to your own member account.

## If you can't sign in or see orders

Contact the branch or organization that registered you—an ADMIN, ORG_ADMIN, BRANCH_MANAGER, or STAFF with `manage:members` can look up or correct your member record. See [Members](/help/members) (staff-facing) for how your record is managed.

## Related guides

- [Roles & permissions](/help/roles-permissions)
- [Orders](/help/orders) (staff-facing detail; your own view is read-only and scoped to you)
