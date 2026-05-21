import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMarketplaceProductBySlug } from "@/lib/services/marketplace.service";
import { buildProductPageMetadata, buildProductJsonLdScript } from "@/lib/products/seo";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getMarketplaceProductBySlug(decodeURIComponent(slug));
  if (!product) {
    return { title: "Product not found" };
  }
  return buildProductPageMetadata(product);
}

export default async function ProductSlugLayout({ children, params }: Props) {
  const { slug } = await params;
  const product = await getMarketplaceProductBySlug(decodeURIComponent(slug));
  if (!product) {
    notFound();
  }

  const jsonLd = await buildProductJsonLdScript(product);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      {children}
    </>
  );
}
