import { stripMarkdownPlainText } from "@/lib/markdown/stripMarkdown";
import type { HelpArticle } from "./types";

export function stripMarkdownForSearch(md: string): string {
  return stripMarkdownPlainText(md);
}

export function articleSearchBlob(a: HelpArticle): string {
  const bodyPlain = stripMarkdownForSearch(a.bodyMarkdown).toLowerCase();
  const journeysPlain =
    a.journeys
      ?.map(
        (j) =>
          `${j.title} ${j.audience} ${j.description} ${j.steps.map((s) => `${s.title} ${s.description}`).join(" ")}`
      )
      .join(" ")
      .toLowerCase() ?? "";
  return `${a.title} ${a.summary} ${a.slug} ${bodyPlain} ${journeysPlain}`.toLowerCase();
}

export function filterArticlesByQuery(articles: HelpArticle[], query: string): HelpArticle[] {
  const q = query.trim().toLowerCase();
  if (!q) return articles;
  return articles.filter((a) => articleSearchBlob(a).includes(q));
}
