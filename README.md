# Glowish

A full-stack retail platform for multi-branch and multi-organization operations. It includes point of sale, inventory, member tracking, B2B orders, commission tracking, a public online storefront, and role-based access control.

## Features

- **Point of Sale** — Branch-scoped checkout with member discounts, variant selection, and real-time stock enforcement
- **Inventory Management** — Per-branch stock tracking, low-stock alerts, and stock movement history
- **Members** — Member registration, discount tiers, and commission tracking
- **Orders** — POS orders, B2B orders, reseller sales, marketplace web orders, and purchase orders with status workflows
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
| Images | Cloudinary (production) or local `public/uploads` (dev) |

## Getting Started

### Prerequisites

- Node.js 20+ (see `engines` in `package.json`)
- MongoDB instance (local or Atlas)

### Environment Variables

Create a `.env.local` file at the project root:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<db>
AUTH_SECRET=<random-secret>
AUTH_URL=http://localhost:3000
```

`AUTH_SECRET` and `AUTH_URL` are what Auth.js / NextAuth v5 expect. (`NEXTAUTH_SECRET` / `NEXTAUTH_URL` are still accepted as aliases in many setups.)

Optional:

- **Cloudinary** (recommended on Vercel): `CLOUDINARY_URL` *or* `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- **Local uploads** (dev): `UPLOAD_DIR` (absolute path; default `public/uploads`), `UPLOAD_FOLDER_ROOT` (default from app name)
- `MAINTENANCE_MODE=true` for maintenance page

When Cloudinary env vars are set, uploads use Cloudinary automatically; otherwise the app falls back to the local filesystem if it is writable.

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
  (marketplace)/  # Public storefront (home, cart, checkout)
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

| Namespace | Path prefix | Auth |
|-----------|-------------|------|
| Staff (dashboard/POS) | `/api/products`, `/api/orders`, … | `withStaffAuth` + `withPermission` on sensitive routes |
| Customer account | `/api/account/*` | `requireCustomerSession` (register is public) |
| Storefront | `/api/marketplace/*` | Public reads; checkout allows guest or customer session |
| Setup / Auth | `/api/setup`, `/api/auth` | Public (rate-limited at the edge) |

Staff routes reject `CUSTOMER` and `MEMBER` roles at the proxy and in `withStaffAuth`. Key permission keys: `manage:users`, `manage:branches`, `manage:products`, `manage:inventory`, `manage:orders`, `manage:members`, `use:pos`, `view:reports`.

Copy `.env.example` to `.env.local` and fill in values before running locally.

## Security Notes

- Passwords are hashed with bcrypt (12 rounds)
- JWT sessions — no server-side session storage
- Staff vs customer API isolation in `proxy.ts` and `withStaffAuth`
- Rate limits on login, registration, and setup (`lib/utils/rateLimit.ts`)
- All list endpoints cap `limit` at 100 to prevent DoS
- Security headers (CSP, HSTS, X-Frame-Options, etc.) set globally in `next.config.ts`
- Setup endpoint is one-time and atomically guarded against concurrent runs
