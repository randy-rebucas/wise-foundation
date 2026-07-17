# Knowledge base (Markdown)

Help articles for the in-app **Help & guides** section live here as `.md` files. The app loads them at runtime from `content/knowledgebase/` (see `lib/knowledgebase/loadMarkdownArticles.ts`).

## File rules

- **One article per file**, any filename ending in `.md` except `README.md`.
- Start with **YAML frontmatter** between `---` lines.
- The Markdown **body** follows the closing `---` and is rendered with GitHub-flavored Markdown (`remark-gfm`).

### Frontmatter fields

| Field | Required | Description |
|-------|----------|-------------|
| `slug` | yes | URL segment: `/help/{slug}` (unique) |
| `title` | yes | Article heading |
| `summary` | yes | Short blurb for cards and SEO |
| `category` | yes | One of: `get-started`, `user-journeys`, `sales-operations`, `catalog-stock`, `people-rewards`, `insights`, `administration` |
| `relatedPaths` | no | List of in-app paths (e.g. `/pos`) shown as chips |
| `permissionsNote` | no | Shown in an “Access” callout |
| `journeys` | no | List of journey objects (see below) |

### Journeys (optional)

Each journey appears as a card with numbered steps. Optional `href` on a step renders an **Open** link.

```yaml
journeys:
  - id: my-journey
    title: Short title
    audience: ORG_ADMIN
    description: One line context.
    steps:
      - title: Step name
        description: What the user does.
        href: /pos
```

## Links

- Use **root-relative** links like `/help/roles-permissions` so navigation stays inside the app.

## Article index (maintain when adding screens)

| Slug | Topic |
|------|--------|
| `storefront-seo` | Public shop SEO, sitemap, admin checklist |
| `settings` | Profile, Application tab, Roles |
| `media` | Media library |
| `online-store` | Sidebar link to public storefront |
| `deliveries` | HQ B2B fulfillment queue |
| `products` | Catalog, marketplace listing, per-product SEO |
| `guide-admin`, `guide-org-admin`, `guide-branch-manager`, `guide-inventory-manager`, `guide-staff`, `guide-member`, `guide-customer` | Complete per-role guides (category: `user-journeys`) |

See `docs/help-knowledgebase-sync.md` for the full audit list.

## Validation

Invalid frontmatter fails the build. Run:

```bash
npm run build
```
