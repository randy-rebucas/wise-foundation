import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { HelpArticle } from "@/lib/knowledgebase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MarkdownBody } from "@/components/help/MarkdownBody";

export function HelpArticleBody({ article }: { article: HelpArticle }) {
  return (
    <div className="space-y-10 max-w-3xl">
      {article.permissionsNote && (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Access: </span>
          {article.permissionsNote}
        </div>
      )}

      <MarkdownBody content={article.bodyMarkdown} />

      {article.relatedPaths.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-base font-semibold tracking-tight text-foreground">Related screens</h2>
          <div className="flex flex-wrap gap-2">
            {article.relatedPaths.map((path) => (
              <Link
                key={path}
                href={path}
                className={cn(badgeVariants({ variant: "secondary" }), "font-mono text-xs hover:opacity-90")}
              >
                {path}
              </Link>
            ))}
          </div>
        </div>
      )}

      {article.journeys && article.journeys.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold tracking-tight text-foreground">User journeys</h2>
          <div className="grid gap-4 sm:grid-cols-1">
            {article.journeys.map((j) => (
              <Card key={j.id} className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{j.title}</CardTitle>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{j.audience}</p>
                  <p className="text-sm text-muted-foreground leading-snug">{j.description}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ol className="list-decimal list-inside space-y-3 text-sm">
                    {j.steps.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">
                        <span className="font-medium text-foreground">{step.title}</span>
                        {" — "}
                        <span className="text-muted-foreground">{step.description}</span>
                        {step.href && (
                          <Link
                            href={step.href}
                            className="ml-2 inline-flex items-center gap-0.5 text-primary hover:underline text-xs font-medium"
                          >
                            Open
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        )}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
