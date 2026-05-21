---
slug: user-journeys
title: User journeys by role
summary: End-to-end flows for each persona—what to do first, what to repeat, and where each step lives in the app.
category: user-journeys
relatedPaths:
  - /dashboard
  - /org-dashboard
  - /org-panel
  - /pos
  - /orders
journeys:
  - id: admin-tenant
    title: Administrator—tenant oversight
    audience: ADMIN
    description: Monitor the business and support branches and organizations.
    steps:
      - title: Review dashboard KPIs
        description: Check sales, members, and alerts.
        href: /dashboard
      - title: Branches & users
        description: Verify branches exist and users are active.
        href: /admin/branches
      - title: Organizations
        description: Audit distributor, franchise, or partner records.
        href: /admin/organizations
      - title: Storefront & SEO
        description: Application name, logo, SEO defaults, and marketplace fulfillment branch.
        href: /settings
      - title: Verify online store
        description: Confirm listed products and branding on the public shop.
        href: /
      - title: Deep dive on issues
        description: Open Orders, Inventory, or Reports as needed.
        href: /orders
  - id: org-admin-distributor
    title: Org admin—distributor / headquarters
    audience: ORG_ADMIN · distributor / headquarters
    description: Stock-led distribution and B2B fulfillment.
    steps:
      - title: Org dashboard
        description: Scan revenue, pending B2B work, and inventory signals.
        href: /org-dashboard
      - title: My Panel
        description: Manage organization inventory and outbound B2B orders.
        href: /org-panel
      - title: Approve or mark paid
        description: Move B2B orders through pending → approved → paid when appropriate.
        href: /org-panel
      - title: Reseller sales & commissions
        description: Record community sales and track payouts when enabled.
        href: /reseller-sales
  - id: org-admin-franchise
    title: Org admin—franchise
    audience: ORG_ADMIN · franchise
    description: POS-heavy operations with optional reseller flows.
    steps:
      - title: My Panel
        description: Review recent sales and quick links.
        href: /org-panel
      - title: POS
        description: Run in-store sales with correct payment method.
        href: /pos
      - title: Reseller sales
        description: Log community or off-system sales feeding commissions.
        href: /reseller-sales
      - title: Commissions & reports
        description: Validate earnings then use reports for period close.
        href: /commissions
  - id: org-admin-partner
    title: Org admin—partner
    audience: ORG_ADMIN · partner
    description: Commission-centric partner workflow.
    steps:
      - title: My Panel
        description: See commission KPIs and recent orders together.
        href: /org-panel
      - title: Reseller sales
        description: Ensure sales that generate commission are captured.
        href: /reseller-sales
      - title: Commissions
        description: Track pending vs paid and reconcile with finance.
        href: /commissions
      - title: Reports
        description: Review trends for your partner manager.
        href: /reports
  - id: branch-manager
    title: Branch manager
    audience: BRANCH_MANAGER
    description: Keep the branch trading with accurate stock and staff coverage.
    steps:
      - title: POS oversight
        description: Train staff on checkout and refunds policy.
        href: /pos
      - title: Orders
        description: Handle exceptions, pickups, or follow-ups.
        href: /orders
      - title: Inventory checks
        description: Investigate low stock and coordinate transfers.
        href: /inventory
      - title: Members
        description: Onboard or update member profiles used at checkout.
        href: /members
  - id: staff-cashier
    title: Staff / cashier
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
  - id: inventory-manager
    title: Inventory manager
    audience: INVENTORY_MANAGER
    description: Maintain accurate on-hand and inbound stock.
    steps:
      - title: Products
        description: Keep SKUs, costs, and catalog metadata current.
        href: /products
      - title: Inventory
        description: Adjust levels, review movements, resolve variances.
        href: /inventory
      - title: Purchase orders
        description: Draft, submit, and receive inbound shipments.
        href: /purchase-orders
      - title: Reports
        description: Use stock views before audits.
        href: /reports
  - id: member-portal
    title: Member portal
    audience: MEMBER
    description: Limited self-service where enabled by your tenant.
    steps:
      - title: Sign in
        description: Use credentials from your sponsor organization.
        href: /login
      - title: Own orders
        description: View history or statuses your tenant exposes.
        href: /orders
---

## How to use this page

Pick the **journey** that matches your role. Each card lists ordered steps; use **Open** to jump to the screen. Combine journeys with feature articles (POS, Orders, etc.) for field-level detail.

## Cross-cutting habits

- **Sign out** on shared devices.
- Keep **member** and **payment** data accurate—commissions and reports depend on clean orders.
- When unsure about access, read [Roles & permissions](/help/roles-permissions).

## Org type → panel

| Organization type | Primary workspace |
|--------------------|-------------------|
| Distributor / HQ | [My Panel](/help/org-panel)—inventory + B2B |
| Franchise | [My Panel](/help/org-panel)—sales + reseller links |
| Partner | [My Panel](/help/org-panel)—commissions emphasis |
