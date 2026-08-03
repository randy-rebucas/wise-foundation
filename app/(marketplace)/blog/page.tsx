import type { Metadata } from "next";
import Link from "next/link";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { buildPageMetadata } from "@/lib/seo/site";
import { listPublishedBlogPosts } from "@/lib/services/marketplace.service";
import { MarketplaceFillImage } from "@/components/marketplace/MarketplaceFillImage";
import { MarketplaceFooter } from "@/components/marketplace/MarketplaceFooter";
import { EmptyState } from "@/components/shared/EmptyState";
import { Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MARKETPLACE_PAGE_FONT,
  MARKETPLACE_PAGE_INNER,
  MARKETPLACE_PAGE_OUTER,
} from "@/lib/marketplace/pageLayout";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicAppSettings();
  return buildPageMetadata({
    title: "Blog",
    description: `Tips, guides, and news from ${settings.appName}.`,
    path: "/blog",
    settings,
  });
}

function formatDate(dateInput: string | Date) {
  return new Date(dateInput).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPage() {
  const settings = await getPublicAppSettings();
  const posts = await listPublishedBlogPosts();

  return (
    <div className={cn(MARKETPLACE_PAGE_OUTER, MARKETPLACE_PAGE_FONT, "pt-0 pb-0")}>
      <div className="-mx-4">
        <section className="bg-white/20 px-6 py-10 shadow-[0_24px_80px_rgba(70,90,58,0.16)] backdrop-blur-xl sm:px-10">
          <div className={MARKETPLACE_PAGE_INNER}>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6ea43f]">
              {settings.appName} Blog
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-playfair-display)] text-4xl font-semibold leading-tight tracking-tight text-[#1e3157] sm:text-5xl">
              Stories, tips & guides
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#1e3157]/82">
              Skincare advice, product guides, and news from our team.
            </p>
          </div>
        </section>
      </div>

      <div className={cn(MARKETPLACE_PAGE_INNER, "mt-6 space-y-6")}>
      <section className="rounded-[10px] border border-white/65 bg-white/50 p-6 shadow-[0_18px_55px_rgba(70,90,58,0.14)] backdrop-blur-xl sm:p-8">
        {posts.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="No posts yet"
            description="Check back soon for new articles."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-[10px] border border-white/60 bg-white/40 transition hover:shadow-[0_14px_40px_rgba(70,90,58,0.18)]"
              >
                <div className="relative h-44 w-full overflow-hidden">
                  <MarketplaceFillImage
                    src={post.coverImage}
                    alt={post.title}
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#6ea43f]">
                    {formatDate(post.publishedAt ?? post.createdAt)}
                  </p>
                  <h2 className="mt-2 font-[family-name:var(--font-yellowtail)] text-lg font-normal text-[#1e3157] group-hover:underline">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#2A4C6A]/78">{post.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      </div>

      <div className="-mx-4 mt-10">
        <MarketplaceFooter
          showSocial
          className="rounded-none border-0 shadow-none backdrop-blur-none"
          innerClassName={MARKETPLACE_PAGE_INNER}
        />
      </div>
    </div>
  );
}
