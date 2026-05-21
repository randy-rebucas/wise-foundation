# Documentation

| Document | Audience | Description |
|----------|----------|-------------|
| [roles-and-permissions-matrix.md](./roles-and-permissions-matrix.md) | Developers / admins | Role × permission matrix, sidebar rules, PO workflow, API gates |
| [roles-and-permissions-matrix.png](./roles-and-permissions-matrix.png) | All | Visual matrix (PNG); regenerate via `node scripts/generate-permissions-matrix-image.mjs` |

Run `pnpm sync:roles` after changing `lib/permissions.ts` to update MongoDB `Role` documents and user permission arrays.

In-app help articles (Markdown) live under [`content/knowledgebase/`](../content/knowledgebase/), including a user-facing [Roles & permissions](../content/knowledgebase/roles-permissions.md) article at `/help/roles-permissions`.
