---
slug: roles-permissions
title: Roles & permissions
summary: Who can do what—role defaults, sidebar access, purchase orders, and organization settings.
category: get-started
relatedPaths:
  - /settings
  - /help/user-journeys
permissionsNote: If a menu item is missing or an action returns “forbidden”, your role or extra permissions need updating. Platform ADMIN users have full access unless a screen is limited by organization scope.
---

Glowish gates features with **roles** and **permission keys**. The sidebar shows what you can open; APIs enforce the same rules on the server.

For the full developer matrix (API routes, middleware, and source file references), see `docs/roles-and-permissions-matrix.md` in the project repository.

## Roles at a glance

| Role | Who | Main scope |
|------|-----|------------|
| **ADMIN** | Platform / HQ operator | All branches and organizations |
| **ORG_ADMIN** | Distributor, franchise, or partner lead | One organization (`organizationId`) |
| **BRANCH_MANAGER** | Branch supervisor | Assigned branches |
| **INVENTORY_MANAGER** | Stock & catalog staff | Products, inventory, reports |
| **STAFF** | Cashier / front desk | POS, members, orders on assigned branches |
| **MEMBER** | Loyalty member | Limited (not full dashboard) |
| **CUSTOMER** | Online shopper | Storefront account only |

**ADMIN** bypasses permission checks in the app. Everyone else needs the right permission keys (from the role defaults plus any extras on your user profile).

## Default permissions by role

| Permission | ADMIN | ORG_ADMIN | BRANCH_MANAGER | INVENTORY_MANAGER | STAFF |
|------------|:-----:|:---------:|:--------------:|:-----------------:|:-----:|
| Branches | ✓ | | | | |
| Users / team | ✓ | ✓ | | | |
| Products & media | ✓ | | ✓ | ✓ | |
| Inventory & suppliers | ✓ | ✓ | ✓ | ✓ | |
| POS | ✓ | ✓ | ✓ | | ✓ |
| Reports | ✓ | ✓ | ✓ | ✓ | |
| Members | ✓ | | ✓ | | ✓ |
| Orders | ✓ | ✓ | ✓ | | ✓ |
| Organizations (admin) | ✓ | ✓ | | | |
| Submit org purchase orders | ✓ | ✓ | | | |
| Org inventory & commissions | ✓ | ✓ | | | |

ORG_ADMIN permissions focus on **their organization**—not HQ branches. Branch roles work within **assigned branches**.

## What you see in the sidebar

| Area | Typical access |
|------|----------------|
| Dashboard | ADMIN only |
| Org Dashboard / My Panel | ORG_ADMIN |
| POS, Products, **Media**, Inventory, Orders, Members, Reports | Matching permission (see table above) |
| **Online store** | All authenticated dashboard users (opens public storefront) |
| Purchase Orders | HQ inventory staff **or** org admins who submit orders |
| **Deliveries** (fulfillment queue) | **HQ ADMIN only**—hidden for distributors and org-bound accounts |
| Reseller Sales & Commissions | ADMIN and ORG_ADMIN |
| Admin → Branches | `manage:branches` |
| Admin → Users | ADMIN |
| Admin → Team | ORG_ADMIN with user management |
| Admin → Organizations | ADMIN |
| **Settings** | All staff (profile/security); **Application** tab ADMIN only |
| **Help & guides** | All authenticated dashboard users |

Help articles are for staff documentation only; they are not indexed as public storefront pages (see [Storefront SEO](/help/storefront-seo)).

## Purchase orders (distributors vs HQ)

| Action | HQ ADMIN | Distributor (ORG_ADMIN) | Branch inventory staff |
|--------|:--------:|:-------------------------:|:----------------------:|
| Create & edit draft PO | ✓ | ✓ (own org; edit own drafts) | ✓ |
| Sign & submit for approval | ✓ | ✓ | ✓ |
| Approve or decline | ✓ | | |
| Mark fulfilled / receive stock (`received`) | ✓ | ✓ (own org) | ✓ |
| Deliveries list (nav) | ✓ | Hidden | Hidden |

Workflow: **draft → submitted → approved → received** (UI: **Mark Fulfilled**), or **declined** / **cancelled**. Approved POs for HQ appear on [Deliveries](/help/deliveries) before fulfillment.

Distributors use **Purchase Orders** to request stock; HQ uses **Deliveries** to fulfill approved orders.

## Organization vs branch data

- **ORG_ADMIN** — Data is scoped to your **organization** (orders, inventory, commissions, purchase orders).
- **Branch roles** — Data is scoped to **branches** on your user record.
- **ADMIN** — Can work across the tenant when managing branches and organizations.

Organization **type** (distributor, franchise, partner, headquarters) changes **My Panel** and recommended journeys—see [User journeys](/help/user-journeys).

## Organization capability flags (admin)

Separate from user roles, each organization can have flags such as retail selling, distribution, inventory, commissions, and order submission. Platform admins manage these under **Organizations**.

## Complete role guides

Full standalone walkthrough per role—what you can access, daily loops, and troubleshooting:

- [Administrator (ADMIN)](/help/guide-admin)
- [Org admin (ORG_ADMIN)](/help/guide-org-admin)
- [Branch manager (BRANCH_MANAGER)](/help/guide-branch-manager)
- [Inventory manager (INVENTORY_MANAGER)](/help/guide-inventory-manager)
- [Staff / cashier (STAFF)](/help/guide-staff)
- [Member (MEMBER)](/help/guide-member)
- [Customer (CUSTOMER)](/help/guide-customer)

## If something is blocked

1. Compare your sidebar to [User journeys](/help/user-journeys) for your role.
2. Missing link → you lack the role or permission for that screen.
3. “Forbidden” on save → API denied the action; ask an ADMIN to adjust your user permissions or role.
4. Distributor accounts never see **Deliveries**—that is intentional; use **Purchase Orders** instead.
5. Public shop indexing (sitemap, meta tags) — administrators: [Storefront SEO](/help/storefront-seo).
