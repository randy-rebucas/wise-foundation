# Full audit: Help, SEO, and app alignment

**Date:** 2025-05-21 (workspace audit)  
**Scope:** `app/(dashboard)/help`, `content/knowledgebase/`, storefront SEO (`lib/seo`, `app/sitemap.ts`, `app/robots.ts`), sidebar routes vs documentation.

---

## Executive summary

| Area | Result |
|------|--------|
| **Storefront SEO (code)** | Implemented and consistent with [`marketplace-seo.md`](./marketplace-seo.md) |
| **Help hub (code)** | Loads 28 articles; dynamic metadata + `noindex` on `/help` |
| **Knowledge base (content)** | **Aligned after this audit** — 6 articles updated for orders, PO permissions, PO status naming, roles links |
| **Route coverage** | All primary sidebar routes have a help article except sub-routes (e.g. `/products/new` covered by Products) |
| **Permissions docs** | Matched to [`lib/permissions.ts`](../lib/permissions.ts); PO workflow wording corrected to status `received` |

---

## 1. Sidebar route coverage

| Route | Help article | Status |
|-------|--------------|--------|
| `/dashboard` | `dashboard` | OK |
| `/org-dashboard` | `org-dashboard` | OK |
| `/org-panel` | `org-panel` | OK |
| `/` (Online store) | `online-store` | OK |
| `/pos` | `pos` | OK |
| `/products`, `/products/new`, `/products/[id]/edit` | `products` | OK (sub-routes implied) |
| `/media` | `media` | OK |
| `/inventory` | `inventory` | OK |
| `/orders` | `orders` | Updated (MARKETPLACE channel) |
| `/purchase-orders`, detail, edit | `purchase-orders`, `purchase-order-detail` | Updated (permissions + status) |
| `/deliveries` | `deliveries` | OK |
| `/reseller-sales` | `reseller-sales` | OK |
| `/commissions` | `commissions` | OK |
| `/members` | `members` | OK |
| `/reports` | `reports` | OK |
| `/help` | `help-and-guides` + all slugs | OK |
| `/settings` | `settings`, `storefront-seo` | OK |
| `/admin/branches` | `admin-branches` | OK |
| `/admin/users` | `admin-users-team` | OK |
| `/admin/organizations` | `admin-organizations` | OK |
| `/login` (staff) | `login` | OK |
| `/setup` | `setup` | OK |
| `/maintenance` | `maintenance` | OK |

**Not in staff sidebar (no dedicated article required):** marketplace `/cart`, `/checkout`, `/account/*` — covered under `online-store` and `storefront-seo`.

---

## 2. Storefront SEO (technical)

### Implemented

| Check | Pass |
|-------|------|
| `NEXT_PUBLIC_APP_URL` documented in `.env.example` | Yes |
| Root `generateMetadata` from app settings | Yes |
| Marketplace layout metadata + WebSite/Organization JSON-LD | Yes |
| Product layout metadata + Product JSON-LD + stock availability | Yes |
| Shop / static pages metadata | Yes |
| Cart, checkout, account `noindex` | Yes |
| Dashboard + auth + **help** `noindex` | Yes |
| `app/sitemap.ts` static + product URLs | Yes |
| `app/robots.ts` disallow staff/private paths | Yes |
| Admin Settings: `seoDefaultDescription`, `seoOgImageUrl` | Yes |
| Product form SEO fields | Yes |
| Unit tests `lib/seo/site.test.ts`, `lib/products/seo.test.ts` | Yes |

### Robots nuance

- `Disallow: /products` blocks the **staff catalog** (`/products`, `/products/new`), not public URLs (`/product/{slug}`).
- `Disallow: /help` blocks crawling staff help; metadata also sets `noindex`.

### Follow-ups (unchanged, low priority)

See **Follow-up todos** in [`marketplace-seo.md`](./marketplace-seo.md) (GSC verification, breadcrumb JSON-LD, dynamic `/shop?category=` titles, etc.).

---

## 3. Help system (code)

| File | Role | Audit note |
|------|------|------------|
| [`app/(dashboard)/help/page.tsx`](../app/(dashboard)/help/page.tsx) | Hub | `generateMetadata` uses tenant `appName`; `robots: noindex` |
| [`app/(dashboard)/help/[slug]/page.tsx`](../app/(dashboard)/help/[slug]/page.tsx) | Article | `generateStaticParams` + per-article `noindex` |
| [`lib/knowledgebase/loadMarkdownArticles.ts`](../lib/knowledgebase/loadMarkdownArticles.ts) | Loader | Zod frontmatter; in-memory cache (restart dev server after new `.md`) |
| [`components/help/HelpHubClient.tsx`](../components/help/HelpHubClient.tsx) | Search/tabs | Indexes all loaded articles automatically |
| [`components/help/HelpArticleBody.tsx`](../components/help/HelpArticleBody.tsx) | Render | Related path chips use root-relative `href` |

**Gap (acceptable):** Help metadata does not use `buildPageMetadata` from `lib/seo/site.ts` — intentional; staff docs are not public SEO targets.

---

## 4. Knowledge base content audit

### Articles updated in this full audit

| Article | Issue | Fix |
|---------|-------|-----|
| `orders.md` | Missing **MARKETPLACE** order type | Added channel table + link to online store |
| `purchase-orders.md` | `permissionsNote` only `manage:inventory` | Added `submit:org_orders` for ORG_ADMIN |
| `purchase-order-detail.md` | Same permissions; vague status | Permissions + **received** / Mark Fulfilled |
| `roles-permissions.md` | Workflow said **Fulfilled** (not DB status) | **received** + UI label; link to storefront SEO |
| `deliveries.md` | UI “Fulfilled” vs enum | Clarified maps to status `received` |
| `settings.md` | Roles tab permission vague | `manage:roles` or ADMIN |

### Already aligned (prior pass)

`settings`, `products`, `media`, `online-store`, `storefront-seo`, `getting-started`, `help-and-guides`, `user-journeys` (ADMIN storefront steps).

### Intentional branding in help copy

- `roles-permissions.md` and `setup.md` mention **Glowish** as product name in prose — OK for default tenant; runtime UI uses configurable `appName`.

### Permission matrix vs code

Verified against [`DEFAULT_ROLE_PERMISSIONS`](../lib/permissions.ts):

- **ORG_ADMIN** has `submit:org_orders`, `view:org_inventory`, `view:org_commissions` — reflected in roles article table.
- **ORG_ADMIN** does **not** default `manage:products` — sidebar Products/Media hidden unless granted.
- **Settings → Roles** tab: `ADMIN` or `manage:roles` ([`settings/page.tsx`](../app/(dashboard)/settings/page.tsx)).

For API-level detail, staff should use [`docs/roles-and-permissions-matrix.md`](./roles-and-permissions-matrix.md).

---

## 5. Cross-doc index

| Audience | Document |
|----------|----------|
| Developers — SEO | [`marketplace-seo.md`](./marketplace-seo.md) |
| Developers — this audit | [`full-audit-help-seo.md`](./full-audit-help-seo.md) |
| Developers — Help maintenance | [`help-knowledgebase-sync.md`](./help-knowledgebase-sync.md) |
| Staff — in app | `/help` (28 articles) |
| Contributors | [`content/knowledgebase/README.md`](../content/knowledgebase/README.md) |

---

## 6. Verification commands

```bash
# Help frontmatter (28 articles)
npx tsx -e "import { loadAllHelpArticles, clearHelpArticleCache } from './lib/knowledgebase/loadMarkdownArticles.ts'; clearHelpArticleCache(); console.log(loadAllHelpArticles().length);"

# SEO unit tests
npm test -- lib/seo/site.test.ts lib/products/seo.test.ts

# Full build (frontmatter + app)
npm run build
```

---

## 7. Remaining backlog (not blocking)

| Item | Owner |
|------|--------|
| Google Search Console + env verification meta | Ops / dev |
| Dynamic metadata for `/shop?category=` | Dev |
| Optional `checkout/success` explicit layout metadata | Dev |
| PayMongo/checkout specifics in help (if staff need runbook) | Content |
| Regenerate roles matrix PNG after permission changes | `pnpm docs:permissions-matrix` |
