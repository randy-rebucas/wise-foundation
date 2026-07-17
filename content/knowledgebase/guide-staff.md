---
slug: guide-staff
title: "Complete guide: Staff / cashier (STAFF)"
summary: Full walkthrough for front-desk and cashier staff—POS checkout, member lookup, and order history.
category: user-journeys
relatedPaths:
  - /pos
  - /members
  - /orders
permissionsNote: "STAFF default permissions: use:pos, manage:members, manage:orders. No product or inventory editing by default."
journeys:
  - id: staff-shift
    title: Staff—a shift, start to finish
    audience: STAFF
    description: Fast, accurate checkout and member lookup.
    steps:
      - title: Open POS
        description: Select branch if prompted; start a new sale.
        href: /pos
      - title: Attach member when required
        description: Lookup member for pricing or loyalty.
        href: /members
      - title: Complete payment
        description: Match cash, card, or mobile wallet amounts.
        href: /pos
      - title: Orders history
        description: Reprint or verify a recent receipt if permitted.
        href: /orders
---

## Who this is for

You're a **cashier or front-desk** staff member. Your job is fast, accurate checkout. Your default permissions are narrow on purpose: POS, members, and orders—no product or inventory editing.

## What you can access

| Area | Path | Notes |
|------|------|-------|
| POS | `/pos` | Ring up sales |
| Members | `/members` | Lookup/attach members at checkout |
| Orders | `/orders` | View/reprint recent orders |
| Settings | `/settings` | Profile, security, read-only account |

You do **not** see Products, Inventory, Purchase Orders, Reports, Dashboard, or any admin screens. If you need to check stock on hand, ask a Branch Manager or Inventory Manager.

## A shift, start to finish

1. **Open POS** (`/pos`). Select the correct branch if your account is tied to more than one.
2. **Build the cart** — scan or search products, adjust quantities.
3. **Attach a member** before totals finalize if the sale should accrue to a loyalty account or use member pricing.
4. **Capture payment** — cash, card, GCash, or whatever tenders are enabled; confirm change due for cash.
5. **Complete checkout** — this creates an order record.
6. **Orders** (`/orders`) — reprint a receipt or verify a recent sale if your account is permitted to.

Full checkout detail: [POS](/help/pos).

## Troubleshooting at the register

| Issue | What to check |
|-------|----------------|
| Product missing from search | Ask a manager to confirm it's in the catalog and available at your branch |
| Price looks wrong | Check the member's pricing tier and any active discount |
| Can't complete checkout | Network connection, your account's POS permission, or stock availability |
| Member not found | Confirm spelling/phone/ID; ask a manager to register them if new |

## Related guides

- [POS](/help/pos)
- [Members](/help/members)
- [Orders](/help/orders)
- [Roles & permissions](/help/roles-permissions)
