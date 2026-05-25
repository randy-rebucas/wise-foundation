# Architecture — Glowish Platform

## Overview

Glowish is a Next.js 16 App Router application deployed on Vercel. It serves three distinct surfaces from a single codebase:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Vercel Edge Network                       │
│  CDN (static assets + public API Cache-Control responses)        │
└────────────────────┬────────────────────────────────────────────┘
                     │
         ┌───────────▼───────────┐
         │   Next.js App Router  │
         │   (Node.js runtime)   │
         └───────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
  ┌──────────┐ ┌──────────┐ ┌──────────────┐
  │Marketplace│ │  Admin   │ │  API Routes  │
  │(customers)│ │Dashboard │ │  /api/*      │
  └──────────┘ └──────────┘ └──────────────┘
        │            │            │
        └────────────▼────────────┘
                     │
         ┌───────────▼───────────┐
         │       MongoDB         │  ← Atlas (replica set)
         │   (Mongoose ODM)      │
         └───────────────────────┘
```

## Application Surfaces

| Surface | Route group | Auth | Description |
|---|---|---|---|
| **Marketplace** | `app/(marketplace)/` | Optional (customer) | Public storefront, product catalog, cart, checkout, customer account |
| **Admin Dashboard** | `app/(dashboard)/` | Required (staff) | POS, inventory, orders, purchase orders, reports, settings |
| **API** | `app/api/` | Varies | REST JSON API backing both surfaces |

## Key Components

### Authentication — NextAuth v5
- JWT session strategy; session cookie `authjs.session-token`
- Two audiences: `staff` and `customer` (checked at credential verify time)
- 2FA/TOTP enforced for ADMIN and ORG_ADMIN roles
- Account lockout after 5 failed attempts (15-minute window)
- `lib/middleware/withStaffAuth.ts` — wraps staff API routes
- `lib/utils/withCustomerRoute.ts` — wraps customer API routes

### Data Layer — MongoDB / Mongoose
- Connection pool: 10 (configured in `lib/db/connect.ts`)
- All models in `lib/db/models/`
- Soft deletes via `deletedAt` field on User, Product, Order, etc.
- Startup connectivity check in `instrumentation.ts`

### Image Storage — Cloudinary / Local Fallback
- Production: Cloudinary (configured via `CLOUDINARY_URL` or individual keys)
- Development fallback: `public/uploads/` (local filesystem)
- All uploads go through `lib/server/cloudinaryStorage.ts`
- Automatic retry with exponential backoff (3 attempts, abort on 4xx auth errors)

### Payments — PayMongo
- Card and GCash payments via PayMongo payment intents
- `lib/paymongo/api.ts` — all PayMongo API calls
- Retry with exponential backoff; 4xx client errors not retried
- Secret key server-side only; public key exposed via `/api/marketplace/paymongo/config`

### Email — Resend
- `lib/email/resend.ts` — lazy-initialized Resend client
- Templates: email verification, order confirmation, password reset
- Gracefully skipped if `RESEND_API_KEY` unset (users auto-verified in dev)

### Caching — Next.js `unstable_cache`
- `listMarketplaceProducts` — 60s TTL, tag `marketplace-products`
- Public API responses with `Cache-Control: public, s-maxage=N, stale-while-revalidate=M`
  - Products (unfiltered p.1): 15s / 60s
  - Facets: 60s / 300s
  - Settings: 120s / 600s

### Error Monitoring — Sentry
- `@sentry/nextjs` — client, server, and edge configs
- Activated by `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN`
- Security events captured via `lib/services/security.service.ts`

### Logging — Pino
- `lib/logger.ts` — singleton logger
- JSON in production, pretty-print in development
- Level controlled by `LOG_LEVEL` env var

## Request Flow — Marketplace Checkout

```
Browser
  │
  ├─ GET /shop → Next.js SSR → listMarketplaceProducts (unstable_cache 60s)
  │
  ├─ POST /api/marketplace/checkout/quote → calculate shipping
  │
  ├─ POST /api/marketplace/paymongo/intent → create PayMongo payment intent
  │
  ├─ [browser tokenises card with PayMongo.js]
  │
  ├─ POST /api/marketplace/paymongo/attach → attach payment method
  │
  └─ POST /api/marketplace/checkout
       │
       ├─ validate stock
       ├─ create Order + OrderItems in MongoDB
       ├─ decrement Inventory
       ├─ create StockMovement records
       └─ send order confirmation email (via Resend)
```

## Request Flow — Staff Login with 2FA

```
Browser (login form)
  │
  ├─ POST /api/auth/signin (NextAuth credentials provider)
  │    email + password → verifyCredentials()
  │    if totpEnabled && no totp token → return { totpRequired: true } → null session
  │
  ├─ [browser shows TOTP input]
  │
  └─ POST /api/auth/signin (NextAuth credentials provider)
       email + password + totp → verifyCredentials() with totpToken
       → verifyTotpToken() checks authenticator.verify()
       → on success: JWT session created
```

## Infrastructure

```
GitHub (source) ──push──► GitHub Actions CI
                              │
                        lint + audit + test + build
                              │
                        Vercel deploy (preview or production)
                              │
                        MongoDB Atlas
                        Cloudinary
                        Resend
                        PayMongo
                        Sentry
```

## Environment Variables

See [deployment-runbook.md](./deployment-runbook.md) for the full table of required and optional variables.

## Security Controls

| Control | Implementation |
|---|---|
| Auth | NextAuth v5 JWT, secure httpOnly cookies |
| CSRF | Built into NextAuth v5; staff API uses Bearer-style session (not cookie-based form posts) |
| Password hashing | bcrypt, cost factor 12, 72-char max |
| Account lockout | 5 failures → 15-min lockout; resets on success |
| 2FA | TOTP (RFC 6238) for ADMIN + ORG_ADMIN; 8 single-use backup codes |
| Rate limiting | In-memory per-IP buckets on auth and public endpoints |
| Input validation | Zod schemas on all API inputs |
| SQL/NoSQL injection | Mongoose query builders; no raw `$where` clauses |
| XSS | Next.js JSX escaping; CSP via Vercel headers |
| Secrets | Never committed; validated at startup via `lib/startup/validateEnv.ts` |
| Audit trail | `AuditLog` collection for all sensitive admin mutations |
| Security events | Sentry + logger alerts on account lockout |
