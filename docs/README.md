# Documentation

| Document | Audience | Description |
|----------|----------|-------------|
| [initial-audit-report.md](./initial-audit-report.md) | Developers / stakeholders | Initial full-app audit: architecture, security, CI, production readiness, priority roadmap |
| [marketplace-seo.md](./marketplace-seo.md) | Developers / admins | Storefront SEO: metadata, sitemap, robots, settings, verification checklist, follow-ups |
| [full-audit-help-seo.md](./full-audit-help-seo.md) | Developers | Full audit: Help KB, sidebar coverage, SEO implementation, verification |
| [help-knowledgebase-sync.md](./help-knowledgebase-sync.md) | Developers | Help KB maintenance index (links to full audit) |
| [roles-and-permissions-matrix.md](./roles-and-permissions-matrix.md) | Developers / admins | Role × permission matrix, sidebar rules, PO workflow, API gates |
| [roles-and-permissions-matrix.png](./roles-and-permissions-matrix.png) | All | Visual matrix (PNG); regenerate via `node scripts/generate-permissions-matrix-image.mjs` |

Run `pnpm sync:roles` after changing `lib/permissions.ts` to update MongoDB `Role` documents and user permission arrays.

In-app help articles (Markdown) live under [`content/knowledgebase/`](../content/knowledgebase/), including a user-facing [Roles & permissions](../content/knowledgebase/roles-permissions.md) article at `/help/roles-permissions`.
