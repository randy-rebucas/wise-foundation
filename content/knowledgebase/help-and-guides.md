---
slug: help-and-guides
title: Help & guides (this knowledge base)
summary: How to use in-app help—search, categories, journeys, and Markdown-based articles.
category: get-started
relatedPaths:
  - /help
---

## What this is

All articles live as **Markdown files** under `content/knowledgebase/` in the repository. The app reads frontmatter (title, summary, category, related paths, optional journeys) and renders the body with GitHub-flavored Markdown (tables, lists, links).

## Using Help in the app

1. Open **Help & guides** from the sidebar.
2. **Search** across titles, summaries, article bodies, and journey text.
3. Browse **tabs** by category when search is empty.
4. Open an article; use **Related screens** chips to jump into the product.
5. Follow **User journeys** cards for step-by-step flows with **Open** links.

## Contributing documentation

- Add a new `.md` file in `content/knowledgebase/` (see `README.md` in that folder).
- Use valid `category` values matching the Help hub tabs.
- Run `npm run build` locally to catch frontmatter validation errors.

## Conventions

- Prefer **internal links** like `/help/roles-permissions` so they open inside the app.
- Put long procedural content in the Markdown body; use **journeys** in frontmatter when steps should appear as cards with Open links.

## Recently documented areas

Keep these articles aligned when features change:

| Topic | Article |
|-------|---------|
| Storefront SEO, sitemap, robots | [Storefront SEO](/help/storefront-seo) |
| Settings tabs (Profile, Application, Roles) | [Settings](/help/settings) |
| Media library | [Media library](/help/media) |
| Public shop from sidebar | [Online store](/help/online-store) |
| HQ B2B fulfillment queue | [Deliveries](/help/deliveries) |
| Product marketplace + SEO fields | [Products](/help/products) |

Developer technical reference: `docs/marketplace-seo.md`.
