---
slug: roles-permissions
title: Roles & permissions
summary: Features are gated by role and permission keys. The sidebar reflects access; APIs enforce the same rules.
category: get-started
relatedPaths:
  - /settings
  - /help/user-journeys
---

## Roles

| Role | Primary scope |
|------|----------------|
| **ADMIN** | Whole tenant—branches, orgs, users, catalog |
| **ORG_ADMIN** | One organization—team, org dashboards, B2B, commissions |
| **BRANCH_MANAGER** | Assigned branches—POS, orders, members, stock |
| **STAFF** | Checkout and member lookup where allowed |
| **INVENTORY_MANAGER** | Products, inventory, purchase orders, reports |
| **MEMBER** | Limited portal (dashboard layout may block full app) |

## Permission keys

Examples: `use:pos`, `manage:orders`, `manage:members`, `view:reports`, `manage:organizations`. Effective permissions combine **role defaults** with optional **extra permissions** on your user record. If an API returns **forbidden**, ask an admin to adjust your user or role.

## Organization vs branch scope

- **ORG_ADMIN** data is usually scoped to `organizationId` (buyer/seller involvement on orders, org inventory, commissions).
- **Branch roles** see data for assigned **branches** (POS, branch inventory).
- **ADMIN** can operate across the tenant when managing branches and organizations.

## Auditing access

1. Compare your sidebar to the [user journeys](/help/user-journeys) article for your role.
2. If a link is missing, you lack role or permission for that screen.
3. Organization **type** (distributor, franchise, partner) changes which **My Panel** experience you see.
