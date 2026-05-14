import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import type { HelpArticle, HelpCategoryId, HelpJourney } from "./types";

const KB_DIR = path.join(process.cwd(), "content", "knowledgebase");

const categoryIdSchema = z.enum([
  "get-started",
  "user-journeys",
  "sales-operations",
  "catalog-stock",
  "people-rewards",
  "insights",
  "administration",
]);

const journeyStepSchema = z.object({
  title: z.string(),
  description: z.string(),
  href: z.string().optional(),
});

const journeySchema = z.object({
  id: z.string(),
  title: z.string(),
  audience: z.string(),
  description: z.string(),
  steps: z.array(journeyStepSchema),
});

const frontmatterSchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  category: categoryIdSchema,
  relatedPaths: z.array(z.string()).optional().default([]),
  permissionsNote: z.string().optional(),
  journeys: z.array(journeySchema).optional(),
});

function parseArticleFile(filePath: string, filename: string): HelpArticle {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const parsed = frontmatterSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Invalid frontmatter in ${filename}: ${parsed.error.message}`);
  }
  const fm = parsed.data;
  const article: HelpArticle = {
    slug: fm.slug,
    title: fm.title,
    summary: fm.summary,
    category: fm.category as HelpCategoryId,
    relatedPaths: fm.relatedPaths ?? [],
    permissionsNote: fm.permissionsNote,
    bodyMarkdown: content.trim(),
    journeys: fm.journeys as HelpJourney[] | undefined,
  };
  return article;
}

let cache: HelpArticle[] | null = null;

export function loadAllHelpArticles(): HelpArticle[] {
  if (cache) return cache;
  if (!fs.existsSync(KB_DIR)) {
    cache = [];
    return cache;
  }
  const files = fs
    .readdirSync(KB_DIR)
    .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md");
  const articles = files
    .map((filename) => parseArticleFile(path.join(KB_DIR, filename), filename))
    .sort((a, b) => {
      const cat = a.category.localeCompare(b.category);
      if (cat !== 0) return cat;
      return a.title.localeCompare(b.title);
    });
  cache = articles;
  return articles;
}

export function clearHelpArticleCache() {
  cache = null;
}
