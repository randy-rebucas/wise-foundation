import type { HelpArticle } from "./types";
import { loadAllHelpArticles } from "./loadMarkdownArticles";
import { filterArticlesByQuery } from "./textSearch";

export function getHelpArticle(slug: string): HelpArticle | undefined {
  return loadAllHelpArticles().find((a) => a.slug === slug);
}

export function getAllHelpArticles(): HelpArticle[] {
  return loadAllHelpArticles();
}

export function getHelpSlugs(): string[] {
  return loadAllHelpArticles().map((a) => a.slug);
}

export function searchHelpArticles(query: string): HelpArticle[] {
  return filterArticlesByQuery(loadAllHelpArticles(), query);
}
