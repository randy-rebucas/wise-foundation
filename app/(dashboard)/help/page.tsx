import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HelpHubClient } from "@/components/help/HelpHubClient";
import { getAllHelpArticles } from "@/lib/knowledgebase";
import { ArrowLeft, BookMarked, Route } from "lucide-react";

export const metadata: Metadata = {
  title: "Help & guides",
  description: "Knowledge base, feature guides, and role-based journeys for Wise.",
};

export default function HelpPage() {
  const articles = getAllHelpArticles();
  const count = articles.length;

  return (
    <div className="flex min-h-full flex-col">
      <Header
        title="Help & guides"
        subtitle={`${count} articles · search or browse by category`}
      />

      <div className="flex-1 border-t bg-muted/15">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
            <div className="min-w-0 space-y-2">
              <p className="text-sm leading-relaxed text-muted-foreground max-w-xl">
                Find how-to guides for every main screen, or follow{" "}
                <span className="font-medium text-foreground">user journeys</span> matched to your role. Articles are
                edited as Markdown in the repository.
              </p>
              <p className="text-xs text-muted-foreground">
                Tip: use the search box below to match titles, summaries, and article text.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button size="sm" className="gap-1.5" asChild>
                <Link href="/help/user-journeys">
                  <Route className="h-3.5 w-3.5" aria-hidden />
                  User journeys
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <Link href="/help/help-and-guides">
                  <BookMarked className="h-3.5 w-3.5" aria-hidden />
                  Using Help
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-1" asChild>
                <Link href="/">
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                  Home
                </Link>
              </Button>
            </div>
          </div>

          <Separator className="my-8" />

          <HelpHubClient articles={articles} />
        </div>
      </div>
    </div>
  );
}
