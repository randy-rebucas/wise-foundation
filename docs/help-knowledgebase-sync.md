# Help knowledge base sync

Maintenance guide for **Help & guides** (`/help`). For the latest full audit (routes, SEO, permissions), see **[`full-audit-help-seo.md`](./full-audit-help-seo.md)**.

Articles live in [`content/knowledgebase/`](../content/knowledgebase/); loaded by [`lib/knowledgebase/loadMarkdownArticles.ts`](../lib/knowledgebase/loadMarkdownArticles.ts).

## Article count

**28** articles (run `npx tsx -e "..."` in full audit doc to verify).

## Quick index

| Category | Slugs |
|----------|--------|
| Get started | `getting-started`, `login`, `settings`, `roles-permissions`, `help-and-guides`, `storefront-seo` |
| User journeys | `user-journeys` |
| Sales | `pos`, `orders`, `reseller-sales`, `online-store` |
| Catalog & stock | `products`, `inventory`, `purchase-orders`, `purchase-order-detail`, `media`, `deliveries` |
| People & rewards | `members`, `commissions` |
| Insights | `reports` |
| Administration | `admin-branches`, `admin-users-team`, `admin-organizations` |
| Home | `dashboard`, `org-dashboard`, `org-panel` |
| Ops | `setup`, `maintenance` |

## When to update

- New sidebar route → new or updated `.md` + `relatedPaths`
- Settings / SEO / marketplace behavior → `settings`, `storefront-seo`, `products`, `online-store`
- Permission or PO workflow changes → `roles-permissions`, `purchase-orders`, `purchase-order-detail`
- After edits: `npm run build`; restart dev server if articles do not appear (loader cache)

## Cross-references

| Audience | Document |
|----------|----------|
| Staff | `/help/*` |
| Full audit | [`full-audit-help-seo.md`](./full-audit-help-seo.md) |
| Storefront SEO (dev) | [`marketplace-seo.md`](./marketplace-seo.md) |
| Contributors | [`content/knowledgebase/README.md`](../content/knowledgebase/README.md) |
