import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { HelpArticleBody } from "@/components/help/HelpArticleBody";
import { HELP_CATEGORIES } from "@/lib/knowledgebase/categories";
import { getHelpArticle, getHelpSlugs } from "@/lib/knowledgebase";
import { ArrowLeft } from "lucide-react";

export function generateStaticParams() {
  return getHelpSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getHelpArticle(slug);
  return {
    title: article ? `${article.title} · Help` : "Help",
    description: article?.summary ?? "Help article",
  };
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getHelpArticle(slug);
  if (!article) notFound();

  const cat = HELP_CATEGORIES[article.category];

  return (
    <div className="flex flex-col">
      <Header
        title={article.title}
        subtitle={`${cat.label} · ${article.summary}`}
      />
      <div className="flex-1 p-6 max-w-4xl w-full mx-auto space-y-8">
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
            <Link href="/help">
              <ArrowLeft className="h-4 w-4 mr-1" />
              All guides
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
        <HelpArticleBody article={article} />
      </div>
    </div>
  );
}
