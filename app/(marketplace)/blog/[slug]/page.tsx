import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { buildPageMetadata } from "@/lib/seo/site";
import { getPublishedBlogPostBySlug } from "@/lib/services/marketplace.service";
import { MarketplaceFillImage } from "@/components/marketplace/MarketplaceFillImage";
import { MarketplaceFooter } from "@/components/marketplace/MarketplaceFooter";
import { MarketplacePageShell } from "@/components/marketplace/MarketplacePageShell";
import { MarkdownContent } from "@/components/shared/MarkdownContent";
import { ArrowLeft } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const settings = await getPublicAppSettings();
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) {
    return buildPageMetadata({
      title: "Blog",
      path: `/blog/${slug}`,
      settings,
      noindex: true,
    });
  }
  return buildPageMetadata({
    title: post.title,
    description: post.summary,
    path: `/blog/${post.slug}`,
    settings,
    image: post.coverImage,
  });
}

function formatDate(dateInput: string | Date) {
  return new Date(dateInput).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) notFound();

  return (
    <MarketplacePageShell>
      <article className="mx-auto w-full max-w-3xl">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#6ea43f] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to blog
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-[#2A4C6A]/70">
          <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
          <span aria-hidden>·</span>
          <span>{post.author}</span>
        </div>

        <h1 className="mt-3 font-[family-name:var(--font-playfair-display)] text-3xl font-semibold text-[#1e3157] sm:text-4xl">
          {post.title}
        </h1>

        {post.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/50 px-3 py-1 text-xs font-medium text-[#1e3157]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {post.coverImage && (
          <div className="relative mt-8 h-64 w-full overflow-hidden rounded-[10px] sm:h-80">
            <MarketplaceFillImage src={post.coverImage} alt={post.title} priority />
          </div>
        )}

        <div className="mt-8 rounded-[10px] border border-white/65 bg-white/50 p-6 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl sm:p-8">
          <MarkdownContent content={post.bodyMarkdown} />
        </div>
      </article>

      <MarketplaceFooter />
    </MarketplacePageShell>
  );
}
