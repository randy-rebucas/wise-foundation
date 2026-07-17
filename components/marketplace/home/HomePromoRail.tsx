import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Lock, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cloudinaryTransformedUrl } from "@/lib/utils/cloudinaryTransform";
import { isRemoteUrl } from "./shared";

const TRUST_CARDS = [
  {
    title: "Secure Checkout",
    description: "Safe & encrypted payments",
    icon: Lock,
  },
  {
    title: "Fast Delivery",
    description: "Nationwide shipping you can trust",
    icon: Truck,
  },
];

type HomePromoRailProps = {
  imageUrl?: string | null;
};

export function HomePromoRail({ imageUrl }: HomePromoRailProps) {
  return (
    <aside className="hidden flex-col gap-4 xl:flex" aria-label="Offers and store guarantees">
      <div className="relative overflow-hidden rounded-[10px] border border-[#e9ddf5] bg-gradient-to-b from-[#efe3f8] via-[#f9f3fc] to-[#fdf6fb] p-6 text-center shadow-[0_2px_12px_rgba(94,70,135,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-white/80 px-3 py-1 text-xs font-semibold text-[#a24b96]">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Special Offer
        </span>
        <p className="mt-4 font-[family-name:var(--font-yellowtail)] text-3xl font-normal leading-snug text-[#3c2e60]">
          Glow More,
          <br />
          Save More!
        </p>
        <p className="mt-3 text-sm leading-6 text-[#4a5568]">
          Enjoy up to{" "}
          <span className="block text-2xl font-bold text-[#1f2a44]">20% OFF</span>
          on selected products.
        </p>
        <Button
          className="mt-5 h-10 w-full rounded-[10px] bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white shadow-[0_10px_30px_rgba(71,125,52,0.24)] hover:from-[#5f9636] hover:to-[#3f702e]"
          asChild
        >
          <Link href="/shop">
            Shop deals now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        {imageUrl ? (
          <div className="relative mt-5 aspect-[4/5] w-full overflow-hidden rounded-[10px]">
            {isRemoteUrl(imageUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cloudinaryTransformedUrl(imageUrl, { width: 400, crop: "limit" })}
                alt="Featured Glowish products"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <Image
                src={imageUrl}
                alt="Featured Glowish products"
                fill
                className="object-cover"
                sizes="280px"
              />
            )}
          </div>
        ) : null}
      </div>

      <div className="rounded-[10px] border border-[#e6f1d8] bg-[#f3f9ec] p-5 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm">
          <Image
            src="/wise.jpg"
            alt="WISE Foundation — Women In the Service for Everyone"
            width={56}
            height={56}
            className="h-full w-full object-contain"
          />
        </span>
        <p className="mt-3 text-sm font-semibold text-[#1f2a44]">Your glow gives back</p>
        <p className="mt-1.5 text-xs leading-5 text-[#64748b]">
          Every order supports the <span className="font-semibold text-[#477d34]">Wise Foundation</span>.
          Each time you treat yourself, you help brighten someone else&rsquo;s day too — thank you
          for glowing with purpose.
        </p>
      </div>

      <div className="space-y-3 rounded-[10px] border border-[#ece7f5] bg-white p-4 shadow-[0_2px_12px_rgba(94,70,135,0.06)]">
        {TRUST_CARDS.map((card) => (
          <div key={card.title} className="flex items-start gap-3 rounded-[10px] border border-[#f0ecf8] bg-[#fbfaff] p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#eef6e4]">
              <card.icon className="h-5 w-5 text-[#477d34]" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#1f2a44]">{card.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-[#64748b]">{card.description}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
