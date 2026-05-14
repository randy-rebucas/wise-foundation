"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Search, X } from "lucide-react";
import type { HelpArticle, HelpCategoryId } from "@/lib/knowledgebase/types";
import { HELP_CATEGORIES } from "@/lib/knowledgebase/categories";
import { filterArticlesByQuery } from "@/lib/knowledgebase/textSearch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER = (Object.keys(HELP_CATEGORIES) as HelpCategoryId[]).sort(
  (a, b) => HELP_CATEGORIES[a].order - HELP_CATEGORIES[b].order
);

export function HelpHubClient({ articles }: { articles: HelpArticle[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => filterArticlesByQuery(articles, query), [articles, query]);

  const byCategory = useMemo(() => {
    const map = new Map<HelpCategoryId, HelpArticle[]>();
    for (const c of CATEGORY_ORDER) map.set(c, []);
    for (const a of filtered) {
      const arr = map.get(a.category) ?? [];
      arr.push(a);
      map.set(a.category, arr);
    }
    return map;
  }, [filtered]);

  const showTabs = !query.trim();

  return (
    <section aria-label="Help articles" className="space-y-8">
      <div className="max-w-xl space-y-2">
        <label htmlFor="help-search" className="sr-only">
          Search help articles
        </label>
        <div
          className={cn(
            "flex h-11 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 shadow-sm",
            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            id="help-search"
            type="text"
            name="help-search-query"
            aria-describedby="help-search-hint"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className={cn(
              "h-full min-h-0 min-w-0 flex-1 border-0 bg-transparent px-0 py-0 shadow-none",
              "text-base md:text-sm placeholder:text-muted-foreground/80",
              "focus-visible:ring-0 focus-visible:ring-offset-0"
            )}
            placeholder="Search guides…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setQuery("");
              }
            }}
          />
          {query.trim() !== "" && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p id="help-search-hint" className="text-xs text-muted-foreground">
          {query.trim() ? (
            <>
              {filtered.length} result{filtered.length === 1 ? "" : "s"} ·{" "}
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">Esc</kbd> clears when focused
            </>
          ) : (
            <>
              {articles.length} articles indexed · focus the field, then{" "}
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">Esc</kbd> to clear
            </>
          )}
        </p>
      </div>

      <div id="help-search-results" aria-live="polite">
        {showTabs ? (
        <Tabs defaultValue="get-started" className="w-full">
          <div className="-mx-1 overflow-x-auto pb-1 sm:mx-0 sm:overflow-visible">
            <TabsList
              className={cn(
                "inline-flex h-auto min-h-10 w-max max-w-full flex-nowrap justify-start gap-1 bg-muted/60 p-1 sm:flex-wrap sm:w-full"
              )}
            >
              {CATEGORY_ORDER.map((id) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className="shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-xs data-[state=active]:shadow-sm sm:text-sm"
                >
                  {HELP_CATEGORIES[id].label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {CATEGORY_ORDER.map((id) => (
            <TabsContent key={id} value={id} className="mt-6 space-y-4 outline-none">
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {HELP_CATEGORIES[id].description}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(byCategory.get(id) ?? []).map((a) => (
                  <Link
                    key={a.slug}
                    href={`/help/${a.slug}`}
                    className={cn(
                      "group rounded-xl outline-none transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    )}
                  >
                    <Card className="h-full border transition-colors group-hover:border-primary/35 group-hover:bg-muted/25">
                      <CardHeader className="pb-2">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <BookOpen className="h-4 w-4" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1 space-y-1">
                            <CardTitle className="text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                              {a.title}
                            </CardTitle>
                            <CardDescription className="text-xs leading-relaxed line-clamp-3">
                              {a.summary}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <span className="font-mono text-[11px] text-muted-foreground">/help/{a.slug}</span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              {(byCategory.get(id) ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No articles in this category.</p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((a) => (
              <Link
                key={a.slug}
                href={`/help/${a.slug}`}
                className={cn(
                  "group rounded-xl outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                )}
              >
                <Card className="h-full border transition-colors group-hover:border-primary/35 group-hover:bg-muted/25">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm font-semibold transition-colors group-hover:text-primary">
                        {a.title}
                      </CardTitle>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {HELP_CATEGORIES[a.category].label}
                      </span>
                    </div>
                    <CardDescription className="text-xs line-clamp-2 leading-relaxed">{a.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <span className="font-mono text-[11px] text-muted-foreground">/help/{a.slug}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
              No matches. Clear the search or pick a category tab to browse everything.
            </p>
          )}
        </div>
        )}
      </div>
    </section>
  );
}
