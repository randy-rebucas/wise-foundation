import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Calendar, Leaf, ShoppingBag, Sparkles } from "lucide-react";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import {
  getPublicReviewById,
  listPublicMarketplaceReviews,
} from "@/lib/services/marketplace.service";
import { buildPageMetadata } from "@/lib/seo/site";
import { formatReviewDate } from "@/lib/marketplace/reviews";
import { cloudinaryTransformedUrl } from "@/lib/utils/cloudinaryTransform";
import { MarketplaceFooter } from "@/components/marketplace/MarketplaceFooter";
import { MarketplacePageShell } from "@/components/marketplace/MarketplacePageShell";
import { MarkdownContent } from "@/components/shared/MarkdownContent";
import { StarRating } from "@/components/marketplace/reviews/StarRating";
import { Button } from "@/components/ui/button";
import { ShareButtons } from "@/components/shared/ShareButtons";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [settings, review] = await Promise.all([
    getPublicAppSettings(),
    getPublicReviewById(id),
  ]);
  if (!review) return buildPageMetadata({ title: "Review not found", path: `/reviews/${id}`, settings });
  return buildPageMetadata({
    title: `${review.reviewerName}'s review of ${review.productName}`,
    description: review.text.replace(/[#*_>`]/g, "").slice(0, 155),
    path: `/reviews/${id}`,
    settings,
    image: review.images?.[0],
  });
}

export default async function ReviewDetailPage({ params }: Props) {
  const { id } = await params;
  const review = await getPublicReviewById(id);
  if (!review) notFound();

  const { reviews: related } = await listPublicMarketplaceReviews({ limit: 4 });
  const relatedOthers = related.filter((r) => r.id !== id).slice(0, 3);

  const featuredImage = review.images?.[0];

  return (
    <MarketplacePageShell>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#2A4C6A]/60">
        <Link href="/" className="hover:text-[#2A4C6A]">Home</Link>
        <span>/</span>
        <Link href="/reviews" className="hover:text-[#2A4C6A]">Reviews</Link>
        <span>/</span>
        <span className="text-[#2A4C6A]">{review.reviewerName}</span>
      </nav>

      {/* Main card */}
      <section className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/50 p-6 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl sm:p-10">
        {/* Back link */}
        <Button variant="ghost" size="sm" className="mb-6 -ml-2 gap-1.5 text-[#2A4C6A]/70 hover:text-[#2A4C6A]" asChild>
          <Link href="/reviews">
            <ArrowLeft className="h-4 w-4" />
            All reviews
          </Link>
        </Button>

        <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:items-start">

          {/* ── Left: review body ───────────────────────────────── */}
          <div>
            {/* Reviewer header */}
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xl font-semibold text-violet-700">
                {review.reviewerName.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="font-semibold text-[#1e3157]">{review.reviewerName}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-[#6ea43f]">
                  Verified buyer
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                </p>
              </div>
              {review.featured && (
                <span className="ml-auto flex items-center gap-1.5 rounded-full bg-[#d965c9]/12 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#d965c9]">
                  <Sparkles className="h-3 w-3" />
                  Featured
                </span>
              )}
            </div>

            {/* Rating + date */}
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <StarRating rating={review.rating} size="md" />
              <span className="flex items-center gap-1.5 text-xs text-[#2A4C6A]/55">
                <Calendar className="h-3.5 w-3.5" />
                {formatReviewDate(review.createdAt)}
              </span>
            </div>

            {/* Review text (markdown) */}
            <div className="mt-6 [&_blockquote]:border-[#d965c9]/40 [&_blockquote]:italic [&_blockquote]:text-[#2A4C6A]/70 [&_p]:leading-7 [&_p]:text-[#2A4C6A]/85 [&_strong]:text-[#1e3157]">
              <MarkdownContent content={review.text} />
            </div>
          </div>

          {/* ── Right: image + sidebar ──────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Featured image — full display */}
            {featuredImage && (
              <div className="overflow-hidden rounded-2xl border border-white/60 shadow-[0_12px_40px_rgba(94,70,135,0.16)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cloudinaryTransformedUrl(featuredImage, { width: 800, crop: "limit" })}
                  alt={`${review.reviewerName}'s review photo`}
                  className="w-full object-cover"
                />
              </div>
            )}

            {/* Product card */}
            <div className="rounded-2xl border border-white/70 bg-white/60 p-5 shadow-sm backdrop-blur">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#6ea43f]">
                Reviewed product
              </p>
              <p className="font-semibold leading-snug text-[#1e3157]">{review.productName}</p>
              {review.productSlug && (
                <Button
                  className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white"
                  asChild
                >
                  <Link href={`/product/${encodeURIComponent(review.productSlug)}`}>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    View product
                  </Link>
                </Button>
              )}
            </div>

            {/* Share */}
            <div className="rounded-2xl border border-white/70 bg-white/60 p-5 shadow-sm backdrop-blur">
              <ShareButtons
                url={`/reviews/${review.id}`}
                title={`${review.reviewerName}'s review of ${review.productName}`}
                description={review.text.replace(/[#*_>`]/g, "").slice(0, 120)}
                image={featuredImage}
              />
            </div>

            {/* CTA card */}
            <div className="rounded-2xl border border-white/70 bg-white/60 p-5 shadow-sm backdrop-blur">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6ea43f]">
                <Leaf className="h-3.5 w-3.5" />
                Share your experience
              </p>
              <p className="text-xs leading-5 text-[#2A4C6A]/70">
                Purchased from us? Sign in and leave your own review after delivery.
              </p>
              <Button variant="outline" size="sm" className="mt-3 w-full rounded-xl border-white/80 bg-white/55" asChild>
                <Link href="/account/reviews">Write a review</Link>
              </Button>
            </div>
          </div>

        </div>
      </section>

      {/* Related reviews */}
      {relatedOthers.length > 0 && (
        <section className="rounded-[2rem] border border-white/60 bg-white/35 p-6 shadow-[0_18px_55px_rgba(94,70,135,0.12)] backdrop-blur-xl sm:p-8">
          <h2 className="mb-5 font-[family-name:var(--font-playfair-display)] text-xl font-semibold text-[#1e3157]">
            More customer reviews
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedOthers.map((r) => (
              <Link
                key={r.id}
                href={`/reviews/${r.id}`}
                className="group flex flex-col rounded-2xl border border-white/65 bg-white/55 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/70 hover:shadow-[0_14px_40px_rgba(94,70,135,0.12)]"
              >
                {r.images?.[0] && (
                  <div className="mb-3 h-32 overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cloudinaryTransformedUrl(r.images[0], { width: 400, crop: "limit" })}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                    {r.reviewerName.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold text-[#3c2e60]">{r.reviewerName}</span>
                </div>
                <StarRating rating={r.rating} size="sm" className="mt-2" />
                <p className="mt-2 line-clamp-2 flex-1 text-xs leading-5 text-[#2A4C6A]/75">
                  {r.text.replace(/[#*_>`]/g, "")}
                </p>
                <p className="mt-2 text-xs font-semibold text-[#6ea43f]">{r.productName}</p>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Button variant="outline" className="rounded-xl border-white/70 bg-white/55" asChild>
              <Link href="/reviews">View all reviews</Link>
            </Button>
          </div>
        </section>
      )}

      <MarketplaceFooter />
    </MarketplacePageShell>
  );
}
