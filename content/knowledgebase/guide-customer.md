---
slug: guide-customer
title: "Complete guide: Customer (CUSTOMER)"
summary: Full walkthrough for online shoppers—browsing the public storefront and managing your own account, no dashboard access.
category: user-journeys
relatedPaths:
  - /
permissionsNote: "CUSTOMER has no dashboard permissions (empty permission set) and is the default signup role for the public marketplace. Access is limited to the public storefront."
---

## Who this is for

You're a **shopper on the public online store**—not a staff member. `CUSTOMER` is the default role assigned when someone signs up on the marketplace, and it grants no dashboard permissions at all.

## What you can access

- The **public storefront** (`/`)—browse products, add to cart, and check out as a customer.
- Your own **account/order history** on the storefront, where the store exposes it.

You have **no access** to `/dashboard` or any staff screens (POS, Products, Inventory, Orders admin view, Members, Reports, Settings tabs beyond your own profile). Attempting to open a dashboard URL directly will be denied.

## Shopping on the storefront

1. Browse or search products on the **online store**.
2. Add items to your cart and check out.
3. Orders you place are fulfilled from the tenant's **marketplace fulfillment branch** (set by the platform ADMIN in Settings → Application).

See [Online store](/help/online-store) for how the storefront is organized, and [Storefront SEO](/help/storefront-seo) if you're curious how listings are indexed.

## Becoming a member or staff account

If a business wants to give you **member pricing/loyalty** (the `MEMBER` role) or a **staff** login, that requires an ADMIN, ORG_ADMIN, BRANCH_MANAGER, or STAFF with `manage:members`/`manage:users` to create or upgrade your account—this isn't self-service.

## Related guides

- [Online store](/help/online-store)
- [Roles & permissions](/help/roles-permissions)
