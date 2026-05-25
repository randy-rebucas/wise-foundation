# Production Todo List — Glowish Platform

> **Project:** Glowish Retail Management Platform (Next.js 16, MongoDB, NextAuth v5)
> **Status:** Feature-complete, ~50–60% production-ready
> **Last Updated:** 2026-05-25

---

## Legend
- `[ ]` Not started
- `[x]` Done
- `[!]` Blocking — must fix before go-live

---

## CRITICAL — Blockers

- [x] **Fix failing test** — `lib/purchaseOrders/draftEdit.test.ts` — removed dead `!canManagePurchaseOrdersInventory` guard; all 103 tests pass
- [x] **Add error monitoring** — Installed `@sentry/nextjs`; `sentry.{client,server,edge}.config.ts`; wired into `instrumentation.ts` and `next.config.ts` via `withSentryConfig`; set `NEXT_PUBLIC_SENTRY_DSN` in env spec and `.env.example`
- [x] **Add structured logging** — Installed pino; `lib/logger.ts` singleton; replaced all 31 `console.*` calls across lib + app with typed pino calls
- [x] **Validate environment on startup** — `instrumentation.ts` + `lib/startup/validateEnv.ts` + `lib/startup/checkDbConnectivity.ts`; crashes with a clear message on missing required vars or DB unreachable
- [x] **Set up automated MongoDB backups** — `scripts/backup-db.sh` (mongodump, gzip, 14-day retention); wire as daily cron job on server with `MONGODB_URI` + `BACKUP_DIR` env vars
- [x] **Configure production CI/CD pipeline** — Updated `.github/workflows/ci.yml`: lint+test+build on every push; preview deploy on PRs; auto-deploy `main` to Vercel production; manual `workflow_dispatch` rollback job

---

## HIGH PRIORITY — Ship Blockers (Should resolve before launch)

### Security
- [x] Add email verification step for marketplace customer signup — `customerAccount.service.ts` generates nanoid token, sends via Resend; `GET /api/account/verify-email` verifies it; skipped gracefully when `RESEND_API_KEY` unset
- [x] Add password complexity validation on signup (min length, character classes) — `lib/validations/password.schema.ts` shared rule: 8–72 chars, uppercase, lowercase, digit or symbol; applied to both staff and customer schemas
- [x] Implement account lockout after N failed login attempts — `failedLoginAttempts` + `lockedUntil` added to User model; `verifyCredentials` enforces lockout after 5 failures (15-min window), resets on success
- [ ] Move rate-limiting buckets from in-memory to Redis so limits survive restarts and deploys
- [x] Add audit logging for sensitive admin operations — `lib/db/models/AuditLog.ts` + `lib/services/audit.service.ts`; wired into `createUser`, `updateUser`, `deleteUser` with actor context
- [x] Review CSRF posture — NextAuth v5 with JWT strategy provides CSRF protection automatically; staff mutation endpoints use bearer-style `withStaffAuth` middleware (not cookie-based), so no additional CSRF tokens required

### Testing
- [ ] Write integration tests for the 74 API route endpoints (prioritize checkout, POS, orders, auth)
- [ ] Write E2E tests for critical user flows: marketplace checkout, POS checkout, purchase order creation, member registration
- [ ] Add component tests for high-complexity UI: POS terminal, cart, order detail, admin tables
- [ ] Raise test coverage from ~5% to ≥60% overall

### Email & Notifications
- [x] Configure transactional email provider — Resend SDK installed; `lib/email/resend.ts` + `lib/email/templates.ts` (verification, order confirmation, password reset templates); activated by setting `RESEND_API_KEY`
- [ ] Wire order confirmation email into marketplace checkout flow
- [ ] Implement password reset flow (request endpoint + reset endpoint + email template exists)
- [ ] Add admin notification for new web orders and low-stock alerts

### Deployment & Infrastructure
- [x] Document all required environment variables — `lib/startup/validateEnv.ts` + `docs/deployment-runbook.md` table covers all required and optional vars with descriptions
- [x] Write a deployment runbook — `docs/deployment-runbook.md`: initial deploy, routine deploy, rollback (3 methods), DB backups, scaling, maintenance mode, health check
- [x] Configure preview deployments on Vercel for pull requests — `.github/workflows/ci.yml` `deploy-preview` job posts preview URL to PR comment
- [ ] Set up uptime monitoring (UptimeRobot, Better Uptime, or equivalent) — ops config; see runbook for steps (requires `/api/health` endpoint first)

### Database
- [x] Audit and document MongoDB indexes — added: `Order(orderNumber unique, cashierId+createdAt)`, `PurchaseOrder(createdBy+status, branchId+status)`, `Product(marketplaceListed+isActive+deletedAt)`, `User(emailVerificationToken sparse)`, `Member(branchId+deletedAt)`
- [ ] Establish a database migration / schema versioning strategy for future changes
- [ ] Set connection pool size based on expected concurrency (currently hard-coded at 10)

---

## MEDIUM PRIORITY — Post-Launch Hardening

### Performance
- [x] Profile and cache hot API responses (product catalog, category list, branch inventory) using Redis or Next.js unstable_cache — `listMarketplaceProducts` cached via `unstable_cache` (60s TTL, tag `marketplace-products`)
- [x] Review image optimization pipeline — Cloudinary `f_auto,q_auto` + width transforms applied in `ProductImageGallery` and marketplace homepage product images
- [ ] Investigate Turbopack warning about filesystem operations in `next.config.ts` and resolve or document
- [x] Add `loading.tsx` skeleton screens for slow data routes — added for dashboard, products, inventory, orders

### Observability & Ops
- [x] Add a `/api/health` endpoint that checks MongoDB, Cloudinary, and PayMongo connectivity and returns status
- [ ] Set up API latency tracking and dashboard (p50/p95/p99 per endpoint)
- [ ] Add database performance metrics monitoring (slow query alerts)
- [ ] Build an admin system health page surfacing: DB status, queue depth, error rate, recent audit events

### Admin Tools
- [x] Build user management UI: lock/unlock accounts — `POST /api/users/:id/lock` wired; `writeAuditLog("user.locked")` on lock/unlock; force password reset and delete already existed
- [x] Build audit log viewer for admins — `GET /api/audit-logs` with `action`, `targetId`, `performedBy`, pagination filters; restricted to `manage:users` permission
- [x] Add database cleanup utility for orphaned records — `scripts/cleanup-db.sh` (dry-run flag; cleans expired email tokens, stale lockouts, soft-deleted users >90d, stale draft POs >30d, audit logs >365d)

### Reliability
- [x] Add retry logic with exponential backoff for PayMongo and Cloudinary API calls
- [ ] Add circuit breaker pattern for external dependencies so one failure doesn't cascade (retry with `shouldAbort` for 4xx added; full circuit breaker is future work)
- [ ] Ensure graceful degradation when Cloudinary is unavailable (fall back to local storage with warning)

### Code Quality
- [ ] Resolve 21 instances of `any`, `@ts-ignore`, and `@ts-expect-error` across `lib/`
- [x] Remove or migrate 3 deprecated functions:
  - `localImageStorage.getStoragePath()` → use `imageUploadConfigured`
  - `getPurchaseOrderCatalogTemplate()` → removed; only use `getPurchaseOrderCatalogTemplateAll`
  - Legacy marketplace shipping method IDs
- [ ] Standardize API error response format across all 74 endpoints (consistent shape: `{ error, code, details }`)

---

## LOW PRIORITY — Nice to Have

### Data & Compliance
- [ ] Encrypt PII at rest: saved payment method tokens, customer addresses (MongoDB Atlas encryption-at-rest recommended; application-level field encryption is future work)
- [x] Define and document data retention policies — `docs/data-retention-policy.md`
- [x] Add customer data export endpoint (GDPR / right to access) — `GET /api/account/data-export` returns JSON attachment
- [x] Add customer account deletion endpoint (GDPR / right to erasure) — `DELETE /api/account/delete-account` anonymises PII immediately

### Security Hardening (Advanced)
- [x] Implement 2FA / TOTP for admin and org-admin accounts — `lib/services/totp.service.ts`; setup/confirm/verify/disable API routes; enforced in `verifyCredentials()`; backup codes generated on enable
- [x] Add security event alerting (failed login spike, unusual admin activity) — `lib/services/security.service.ts`; Sentry `captureMessage("warning")` + pino warn on lockout event
- [ ] Conduct a full OWASP Top 10 review and remediate findings
- [x] Schedule periodic dependency vulnerability scans — `npm audit --audit-level=high` in CI; `.github/dependabot.yml` weekly minor/patch updates

### Documentation
- [x] Generate OpenAPI / Swagger spec for all API routes — `docs/openapi.yaml` (OpenAPI 3.1)
- [x] Write architecture diagram (services, data flow, external integrations) — `docs/architecture.md`
- [x] Document database schema (collections, indexes, relationships) — `docs/database-schema.md`
- [x] Write troubleshooting guide for common operational issues — `docs/troubleshooting.md`

### Scalability
- [ ] Evaluate Redis for session caching if JWT size grows or token revocation is needed
- [ ] Plan horizontal scaling strategy (stateless app tier is ready; DB sharding/replica set for reads)
- [ ] Add CDN configuration for static assets and public product images

### Analytics & Business Intelligence
- [ ] Integrate product view / conversion tracking for the marketplace storefront
- [ ] Add revenue dashboard (daily/weekly/monthly totals across all channels)
- [ ] Set up funnel analysis for marketplace checkout abandonment

---

## Quick Wins (< 1 day each)

- [x] Add `robots.txt` and verify `sitemap.xml` — `app/robots.ts` + `app/sitemap.ts` already existed with correct disallow paths and product slugs
- [x] Confirm all `<meta>` tags and Open Graph tags — product pages use `buildProductPageMetadata`; shop page now has `generateMetadata`; root layout uses `buildRootMetadata`
- [x] Set `Cache-Control` headers on public API responses — products (unfiltered p.1): 15s/60s SWR; facets: 60s/300s; settings: 120s/600s
- [x] Add `X-Request-ID` header to all API responses — `middleware.ts` generates UUID per request and sets `X-Request-ID` response header
- [x] Verify all forms have proper `autocomplete` attributes — checkout form: email, name, tel, address-line1/2, address-level1/2, postal-code; login/register already had correct attributes

---

## Estimated Timeline

| Phase | Scope | Effort |
|-------|-------|--------|
| Phase 1 — Blockers | Fix failing test, error monitoring, logging, env validation, backups, CI/CD | 1–2 weeks |
| Phase 2 — Pre-Launch | Security hardening, email, testing coverage, deployment docs, DB indexes | 2–3 weeks |
| Phase 3 — Post-Launch | Performance, admin tools, reliability, code quality cleanup | 2–4 weeks |
| Phase 4 — Continuous | Compliance, advanced security, analytics, scalability planning | Ongoing |

---

## Build Health Snapshot (as of 2026-05-25)

| Check | Status |
|-------|--------|
| `npm run build` | ✅ Passes (1 Turbopack warning) |
| `npm run lint` | ✅ Passes |
| TypeScript compilation | ✅ Passes |
| Unit tests | ✅ 103/103 passing |
| Integration tests | ❌ None exist |
| E2E tests | ❌ None exist |
| Error monitoring | ✅ Sentry configured |
| Automated backups | ✅ `scripts/backup-db.sh` daily cron |
| CI/CD to production | ✅ GitHub Actions → Vercel |
