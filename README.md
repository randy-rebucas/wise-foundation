# Wise Livelihood Platform

A full-stack business management platform built for multi-branch and multi-organization operations. It includes a point-of-sale system, inventory management, member tracking, B2B order processing, commission tracking, and role-based access control.

## Features

- **Point of Sale** — Branch-scoped checkout with member discounts, variant selection, and real-time stock enforcement
- **Inventory Management** — Per-branch stock tracking, low-stock alerts, and stock movement history
- **Members** — Member registration, discount tiers, and commission tracking
- **Orders** — POS orders, B2B orders, reseller sales, and purchase orders with status workflows
- **Organizations** — Multi-org support (distributor, franchise, partner, headquarters) with org-level inventory
- **Products** — Product catalog with variants, SKU management, and category filtering
- **Reports** — Sales summaries, top products, branch performance, and inventory alerts
- **Users & Roles** — ADMIN, ORG_ADMIN, BRANCH_MANAGER, INVENTORY_MANAGER, and STAFF roles with granular permissions
- **Suppliers** — Supplier management linked to purchase orders

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Auth | NextAuth v5 (credentials provider, JWT sessions) |
| Database | MongoDB via Mongoose |
| Validation | Zod |
| UI | Tailwind CSS + shadcn/ui (Radix UI) |
| State | Zustand (cart), TanStack Query (server state) |
| Images | Cloudinary |

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance (local or Atlas)

### Environment Variables

Create a `.env.local` file at the project root:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<db>
NEXTAUTH_SECRET=<random-secret>
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=<random-secret>
```

Generate secrets with:
```bash
openssl rand -hex 32
```

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first launch you will be redirected to the setup wizard to create the initial admin account and configure the app.

### Seed Data (optional)

```bash
npm run seed
```

## Project Structure

```
app/
  (auth)/         # Login page
  (dashboard)/    # All protected pages (POS, inventory, orders, reports, …)
  api/            # Route handlers
lib/
  db/             # Mongoose models and connection
  middleware/     # withAuth / withPermission HOFs
  services/       # Business logic (one file per domain)
  utils/          # apiResponse, pagination, formatting helpers
  validations/    # Zod schemas
components/
  pos/            # ProductGrid, CartPanel, CheckoutModal
  ui/             # shadcn/ui components
store/            # Zustand stores (cart)
types/            # Shared TypeScript types
```

## Role Permissions

| Role | Access |
|---|---|
| `ADMIN` | Full system access |
| `ORG_ADMIN` | Scoped to their organization's branches, users, inventory, and orders |
| `BRANCH_MANAGER` | Manage branch users, inventory, and orders |
| `INVENTORY_MANAGER` | View and update inventory and products |
| `STAFF` | POS checkout only |

## API Overview

All API routes live under `/api/` and are protected by `withAuth`. Routes that mutate data or access sensitive resources additionally require `withPermission("<permission-key>")`.

Key permission keys: `manage:users`, `manage:branches`, `manage:products`, `manage:inventory`, `manage:orders`, `manage:members`, `use:pos`, `view:reports`.

## Security Notes

- Passwords are hashed with bcrypt (12 rounds)
- JWT sessions — no server-side session storage
- All list endpoints cap `limit` at 100 to prevent DoS
- Security headers (CSP, HSTS, X-Frame-Options, etc.) set globally in `next.config.ts`
- Setup endpoint is one-time and atomically guarded against concurrent runs
