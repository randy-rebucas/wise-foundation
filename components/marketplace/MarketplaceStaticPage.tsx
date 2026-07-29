import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketplaceFooter } from "@/components/marketplace/MarketplaceFooter";
import { cn } from "@/lib/utils";
import {
  MARKETPLACE_PAGE_FONT,
  MARKETPLACE_PAGE_INNER,
  MARKETPLACE_PAGE_OUTER,
} from "@/lib/marketplace/pageLayout";

type Props = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export function MarketplaceStaticPage({ eyebrow, title, subtitle, children }: Props) {
  return (
    <div className={cn(MARKETPLACE_PAGE_OUTER, MARKETPLACE_PAGE_FONT, "pt-0 pb-0")}>
      <div className="-mx-4">
        <section className="overflow-hidden bg-white/25 px-6 py-10 shadow-[0_24px_80px_rgba(70,90,58,0.14)] backdrop-blur-xl sm:px-10">
          <div className={MARKETPLACE_PAGE_INNER}>
            <div className="mb-6 flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" className="text-[#2A4C6A]/80" asChild>
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Home
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="border-white/70 bg-white/50" asChild>
                <Link href="/shop">Shop</Link>
              </Button>
              <Button variant="outline" size="sm" className="border-white/70 bg-white/50" asChild>
                <Link href="/contact">Contact</Link>
              </Button>
            </div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6ea43f]">{eyebrow}</p>
            <h1 className="mt-3 font-[family-name:var(--font-playfair-display)] text-3xl font-semibold tracking-tight text-[#1e3157] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#1e3157]/82">{subtitle}</p>
          </div>
        </section>
      </div>

      <div className={cn(MARKETPLACE_PAGE_INNER, "mt-5")}>
        <section className="mx-auto w-full max-w-4xl space-y-6 rounded-[10px] border border-white/60 bg-white/30 px-6 py-8 shadow-[0_18px_60px_rgba(70,90,58,0.1)] backdrop-blur-xl sm:px-10">
          {children}
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

export function MarketplaceStaticSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-[family-name:var(--font-yellowtail)] text-xl font-normal text-[#1e3157]">
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-7 text-[#2A4C6A]/90">{children}</div>
    </div>
  );
}
