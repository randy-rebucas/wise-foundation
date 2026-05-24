# Initial application audit report

**Date:** 2026-05-23  
**Scope:** Full-stack baseline audit — architecture, security, storefront SEO, code quality, CI, production readiness.  
**Product:** Glowish (`package.json` name) — multi-branch retail platform with POS, inventory, B2B/reseller flows, and a public marketplace.

**Related docs (narrower scope, already completed):**

| Document | Scope |
|----------|--------|
| [`marketplace-seo.md`](./marketplace-seo.md) | Storefront SEO implementation and admin settings |
| [`full-audit-help-seo.md`](./full-audit-help-seo.md) | Help KB, sidebar coverage, SEO verification |
| [`roles-and-permissions-matrix.md`](./roles-and-permissions-matrix.md) | RBAC matrix and API gates |

This report is the **first broad audit** of the application. Use it for launch planning and prioritization. Deeper follow-up audits (API authorization spot-check, PayMongo integration, accessibility) are listed in the roadmap below.

---

## Executive summary

| Dimension | Rating | Summary |
|-----------|--------|---------|
| **Architecture** | Strong | Clear route groups, service layer, RBAC, staff vs customer API split |
| **Security** | Good (gaps below) | Headers, bcrypt, setup guards, proxy auth; CSP and rate limits need production hardening |
| **SEO (storefront)** | Good | Metadata, sitemap, robots, JSON-LD largely in place; client-heavy pages limit crawlable HTML |
| **Code quality / CI** | Needs attention | 1 failing test, 19 ESLint errors — CI likely red |
| **Test coverage** | Moderate | Solid unit tests on permissions, PO, payments utils; no E2E |
| **Production readiness** | Near-ready | Env config and PayMongo CSP are the main blockers |

### Scale snapshot

| Metric | Value |
|--------|-------|
| API route handlers | ~76 |
| Pages | ~55 |
| Unit test files | 25 |
| Unit tests | 103 (102 passing at audit time) |
| ESLint problems | 56 (19 errors, 37 warnings) |

### Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Auth | NextAuth v5 (credentials, JWT sessions) |
| Database | MongoDB via Mongoose |
| Validation | Zod |
| UI | Tailwind CSS + shadcn/ui (Radix) |
| State | Zustand (cart), TanStack Query (server state) |
| Payments | PayMongo (optional) |
| Images | Cloudinary (production) or local `public/uploads` (dev) |

---

## Strengths

### 1. Security architecture

- **Edge proxy** ([`proxy.ts`](../proxy.ts)): setup gating, maintenance mode, session checks, staff/customer API isolation, rate limits on auth/register/setup.
- **Defense in depth:** `withStaffAuth` + `withPermission` on staff routes; `requireCustomerSession` / `withCustomerRoute` on account APIs.
- **Security headers** in [`next.config.ts`](../next.config.ts): CSP, HSTS, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **Setup** ([`app/api/setup/route.ts`](../app/api/setup/route.ts)): transactional, idempotent, rate-limited; blocks duplicate admin creation.
- **Passwords:** bcrypt, 12 rounds (see [README](../README.md)).
- **Pagination cap:** `MAX_LIMIT = 100` in [`lib/utils/pagination.ts`](../lib/utils/pagination.ts).

### 2. Domain model and data layer

- Mongoose models with compound indexes on high-traffic collections (orders, inventory, users, purchase orders).
- Product `slug` has a unique partial index (soft-delete aware) in [`lib/db/models/Product.ts`](../lib/db/models/Product.ts).
- Business logic in `lib/services/`; Zod schemas in `lib/validations/`.

### 3. Storefront SEO

Implemented and documented in [`marketplace-seo.md`](./marketplace-seo.md). Highlights:

- [`app/sitemap.ts`](../app/sitemap.ts), [`app/robots.ts`](../app/robots.ts), [`lib/seo/site.ts`](../lib/seo/site.ts).
- Product metadata + Product JSON-LD via [`app/(marketplace)/product/[slug]/layout.tsx`](../app/(marketplace)/product/[slug]/layout.tsx).
- Static marketplace pages use server `generateMetadata`.
- Private routes (cart, checkout, account, dashboard) use `noindex`.

### 4. Documentation and operability

- README, [`.env.example`](../.env.example), permissions matrix, in-app help under [`content/knowledgebase/`](../content/knowledgebase/).
- CI workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — lint → test → build.
- Seed/reset scripts for local development.

---

## Critical / high priority

### P0-1. CI is likely failing

| Check | Result (2026-05-23) |
|-------|------------------------|
| Unit tests | **102 pass / 1 fail** — [`lib/purchaseOrders/draftEdit.test.ts`](../lib/purchaseOrders/draftEdit.test.ts) (expected throw not thrown) |
| ESLint | **19 errors**, 37 warnings (mostly React Compiler rules: `setState` in `useEffect`, memoization) |
| Build | Blocked in CI until lint passes |

**Action:** Fix the failing PO draft-edit test and ESLint errors; confirm `npm run build` succeeds.

### P0-2. Content Security Policy vs PayMongo

Production CSP in [`next.config.ts`](../next.config.ts) allows only `'self'` for `script-src` and `connect-src`.

[`components/marketplace/PaymongoCardPayment.tsx`](../components/marketplace/PaymongoCardPayment.tsx) loads `https://js.paymongo.com/v1`. Server calls in [`lib/paymongo/api.ts`](../lib/paymongo/api.ts) use `https://api.paymongo.com/v1`.

**Risk:** Card checkout may work in development (relaxed CSP) but **break in production**.

**Action:** Extend CSP for PayMongo script and API hosts (and any 3DS iframe domains PayMongo documents).

### P0-3. `NEXT_PUBLIC_APP_URL` required for production SEO

[`lib/seo/site.ts`](../lib/seo/site.ts) falls back to `http://localhost:3000` when unset, with a production warning.

**Risk:** Wrong canonical URLs, sitemap entries, and Open Graph links in production.

**Action:** Set on every production/staging environment before go-live (documented in [`.env.example`](../.env.example)).

### P0-4. In-memory rate limiting

[`lib/utils/rateLimit.ts`](../lib/utils/rateLimit.ts) uses a process-local `Map`. On serverless or multi-instance deployments, limits are per instance, not global.

**Action:** For production scale, use Redis/Upstash/Vercel KV (or edge rate limiting) for auth, register, and setup buckets.

---

## Medium priority

### P1-1. Client-rendered storefront pages

Key routes are `"use client"` and fetch via API after mount:

| Route | File |
|-------|------|
| `/` (home) | [`app/(marketplace)/page.tsx`](../app/(marketplace)/page.tsx) |
| `/shop` | [`app/(marketplace)/shop/page.tsx`](../app/(marketplace)/shop/page.tsx) |
| `/product/[slug]` (UI) | [`app/(marketplace)/product/[slug]/page.tsx`](../app/(marketplace)/product/[slug]/page.tsx) |
| `/cart`, `/checkout` | [`app/(marketplace)/cart/page.tsx`](../app/(marketplace)/cart/page.tsx), [`checkout/page.tsx`](../app/(marketplace)/checkout/page.tsx) |
| Most `/account/*` | Under [`app/(marketplace)/account/`](../app/(marketplace)/account/) |

**Metadata and JSON-LD** for products are server-rendered via layout, which helps search engines. **Body content is not in initial HTML** — weaker crawlability and LCP than server components.

**Action (phased):** Split server shell + client islands for shop/home/product listing; keep existing `generateMetadata` patterns.

### P1-2. NextAuth v5 beta

`next-auth@5.0.0-beta.31` — acceptable for greenfield; track stable release.

**JWT sessions** — no server-side revocation without extra work (password change, role change, compromise).

**Action:** Document session invalidation expectations; consider a denylist for high-security deployments.

### P1-3. No React error boundaries

No `error.tsx` or `global-error.tsx` found under `app/`.

**Action:** Add route-group error UI for marketplace and dashboard.

### P1-4. Guest checkout abuse surface

[`app/api/marketplace/checkout/route.ts`](../app/api/marketplace/checkout/route.ts) allows guest orders (session optional). Registration is rate-limited; checkout itself is not beyond proxy-level auth paths.

**Action:** Consider checkout rate limits, CAPTCHA, or fraud rules before high-traffic launch.

### P1-5. Auth dependency on MongoDB at proxy layer

[`proxy.ts`](../proxy.ts) calls `auth()` and setup checks with DB timeouts. Failures return 503 — correct behavior, but the entire app can feel down if MongoDB is slow.

**Action:** Monitor DB latency; review [`lib/utils/setupRequiredCache.ts`](../lib/utils/setupRequiredCache.ts) caching strategy.

---

## Low priority / informational

| Item | Notes |
|------|--------|
| Debug route | [`app/api/debug/maintenance/route.ts`](../app/api/debug/maintenance/route.ts) — 404 in production, auth in dev |
| `maintenance/status` | Requires session via `auth()` wrapper |
| Help KB / SEO content | Prior audit — see [`full-audit-help-seo.md`](./full-audit-help-seo.md) |
| Accessibility | Some `aria-*` in marketplace components; no systematic a11y audit |
| Package name vs folder | Repo folder `wise`, package name `glowish` — cosmetic |
| Missing E2E | No Playwright/Cypress; manual QA for checkout/PO/POS flows |

---

## Security checklist (quick pass)

| Control | Status |
|---------|--------|
| HTTPS / HSTS | Configured in headers |
| Auth on staff APIs | Proxy + `withStaffAuth` |
| Auth on customer APIs | `withCustomerRoute` / `requireCustomerSession` |
| RBAC | `withPermission` + org-scoped capabilities |
| Input validation | Zod on setup, checkout, auth |
| Secrets in repo | `.env.example` only — no secrets committed |
| IDOR patterns | Services scope by userId/org — **recommend spot-audit** of order and PO detail routes |
| File uploads | Cloudinary + local fallback — verify size/type limits in upload routes |
| CSRF | NextAuth + same-site cookies; standard for this stack |

---

## API surface overview

| Namespace | Path prefix | Auth |
|-----------|-------------|------|
| Staff (dashboard/POS) | `/api/products`, `/api/orders`, … | `withStaffAuth` + `withPermission` on sensitive routes |
| Customer account | `/api/account/*` | `requireCustomerSession` (register is public) |
| Storefront | `/api/marketplace/*` | Public reads; checkout allows guest or customer session |
| Setup / Auth | `/api/setup`, `/api/auth` | Public (rate-limited at proxy) |

Staff routes reject `CUSTOMER` and `MEMBER` roles at the proxy and in `withStaffAuth`. Key permission keys: `manage:users`, `manage:branches`, `manage:products`, `manage:inventory`, `manage:orders`, `manage:members`, `use:pos`, `view:reports`.

---

## Recommended priority roadmap

| Phase | Items | Effort |
|-------|--------|--------|
| **P0** | Fix failing test; fix ESLint errors; verify `npm run build` | Small |
| **P0** | PayMongo CSP; set `NEXT_PUBLIC_APP_URL` in prod/staging | Small |
| **P1** | Distributed rate limiting; checkout abuse limits | Medium |
| **P1** | Server-render shop/home/product content | Medium–Large |
| **P2** | `error.tsx` boundaries; E2E checkout smoke tests | Medium |
| **P2** | NextAuth stable upgrade plan; session revocation policy | Medium |

### Follow-up audits (not yet done)

- [ ] **API authorization spot-check** — verify IDOR protection on `orders/[id]`, `purchase-orders/[id]`, org-scoped list filters.
- [ ] **PayMongo end-to-end** — CSP fix + test card flow in production-like build.
- [ ] **Accessibility audit** — keyboard nav, form labels, contrast on marketplace checkout.
- [ ] **Performance** — LCP on client-rendered home/shop; image sizing via `next/image`.

---

## Verification commands

Run from repo root after changes:

```bash
npm run lint
npm run test
npm run build
```

CI runs the same sequence in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-23 | Initial report created |
