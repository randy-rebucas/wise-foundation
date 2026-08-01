"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  FlaskConical,
  Heart,
  Leaf,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cloudinaryTransformedUrl } from "@/lib/utils/cloudinaryTransform";
import { isRemoteUrl, scrollToSection, type HomeHeroSlot } from "./shared";
import { MARKETPLACE_PAGE_INNER } from "@/lib/marketplace/pageLayout";

const TRUST_PILLS = [
  { label: "Natural ingredients", icon: Leaf },
  { label: "Dermatologically tested", icon: FlaskConical },
  { label: "Cruelty-free", icon: Heart },
  { label: "Safe for all skin types", icon: ShieldCheck },
];

const HERO_PRODUCT_POSITIONS = [
  "left-[4%] top-[16%] h-64 w-44 rotate-[-7deg] sm:h-72 sm:w-48",
  "left-[36%] top-[16%] h-64 w-44 sm:h-72 sm:w-48",
  "right-[3%] top-[16%] h-64 w-44 rotate-[6deg] sm:h-72 sm:w-48",
];

type HomeHeroProps = {
  slots: HomeHeroSlot[];
  totalProducts: number | null;
};

export function HomeHero({ slots, totalProducts }: HomeHeroProps) {
  const first = slots[0];

  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#FBE9BF] via-[#f6faf3] to-[#ECF3E8] px-4 py-8 sm:px-6 lg:py-12">
      {/* Photographic backdrop — falls back to the gradient above if the asset is missing */}
      <div
        className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: "url('/963e981a-0e13-4177-8ff2-bd0a0ad4a030.png')" }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-white/55 via-white/20 to-transparent" />
      <Sparkles
        className="pointer-events-none absolute left-[46%] top-8 -z-10 h-5 w-5 text-[#F79921]/70"
        aria-hidden
      />
      <Sparkles
        className="pointer-events-none absolute bottom-16 left-10 -z-10 h-4 w-4 text-[#F79921]/60"
        aria-hidden
      />
      <div className={MARKETPLACE_PAGE_INNER}>
      <div className="grid items-center gap-8 lg:min-h-[480px] lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#FBE9BF]/80 px-3.5 py-1.5 text-xs font-semibold text-[#a5691a]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Premium Skincare
          </span>
          <div className="max-w-xl space-y-4">
            <h1 className="font-[family-name:var(--font-yellowtail)] text-5xl font-normal leading-tight text-[#2B6B56] sm:text-6xl lg:text-7xl">
              Glowish
              <span className="block font-[family-name:var(--font-yellowtail)] text-5xl font-normal text-[#F79921] sm:text-6xl lg:text-7xl">
                Get the Glow you wish
              </span>
            </h1>
            <p className="max-w-lg text-base leading-7 text-[#4a5568] sm:text-lg">
              Premium skincare crafted for healthy, radiant skin. Discover cleansers, serums,
              and daily essentials shipped from our fulfillment center to you.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="h-12 rounded-[10px] bg-gradient-to-r from-[#6ea43f] to-[#477d34] px-7 text-white shadow-[0_10px_30px_rgba(71,125,52,0.28)] hover:from-[#5f9636] hover:to-[#3f702e]"
              asChild
            >
              <Link href="/shop">
                Shop now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-[10px] border-[#c9dcbb] bg-white px-7 text-[#2A4C6A] shadow-sm hover:bg-[#f4f8f0]"
              onClick={() => scrollToSection("why-glowish")}
            >
              Learn more
            </Button>
          </div>
        </div>

        <div className="relative flex min-h-[14rem] items-end justify-center overflow-hidden rounded-[10px] bg-white/50 p-4 md:hidden">
          {first?.product ? (
            <Link
              href={`/product/${encodeURIComponent(first.product.slug)}`}
              className="relative h-40 w-28 overflow-hidden rounded-[10px] border border-white shadow-lg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cloudinaryTransformedUrl(first.imageUrl, { width: 200, crop: "limit" })}
                alt={first.product.name}
                className="h-full w-full object-cover"
              />
            </Link>
          ) : first ? (
            <div className="relative h-40 w-28 overflow-hidden rounded-[10px] border border-white shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cloudinaryTransformedUrl(first.imageUrl, { width: 200, crop: "limit" })}
                alt="Featured from our catalog"
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <Leaf className="h-16 w-16 text-[#6ea43f]/60" />
          )}
        </div>

        <div className="relative hidden min-h-[460px] md:block lg:min-h-[480px]">
          {HERO_PRODUCT_POSITIONS.map((position, index) => {
            const slot = slots[index];
            if (!slot) return null;
            const shellClass = `absolute ${position} overflow-hidden rounded-[10px] border border-white bg-white p-3 shadow-[0_22px_50px_rgba(70,90,58,0.2)] transition hover:shadow-[0_26px_58px_rgba(70,90,58,0.28)]`;
            const inner = (
              <div className="relative h-full overflow-hidden rounded-[10px] bg-gradient-to-br from-white to-[#f4f8f0]">
                {isRemoteUrl(slot.imageUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cloudinaryTransformedUrl(slot.imageUrl, { width: 480, crop: "limit" })}
                    alt={slot.product?.name ?? "Featured product"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Image
                    src={slot.imageUrl}
                    alt={slot.product?.name ?? "Featured product"}
                    fill
                    className="object-cover"
                    sizes="220px"
                    priority={index === 0}
                  />
                )}
              </div>
            );
            return slot.product ? (
              <Link
                key={slot.product._id}
                href={`/product/${encodeURIComponent(slot.product.slug)}`}
                className={shellClass}
                aria-label={slot.product.name}
              >
                {inner}
              </Link>
            ) : (
              <div key={position} className={shellClass}>
                {inner}
              </div>
            );
          })}
          <div className="absolute bottom-6 right-2 rounded-[10px] border border-white bg-white/90 p-4 shadow-[0_14px_40px_rgba(70,90,58,0.16)] sm:right-6">
            <p className="text-sm font-semibold text-[#2B6B56]">Curated for you</p>
            <p className="mt-1 max-w-56 text-xs leading-5 text-[#4a5568]/85">
              {totalProducts
                ? `${totalProducts} products available online today.`
                : "Fresh picks from our online catalog."}
            </p>
          </div>
        </div>
      </div>

      <ul className="mt-8 flex flex-wrap items-center gap-2 sm:gap-3">
        {TRUST_PILLS.map((pill) => (
          <li
            key={pill.label}
            className="flex items-center gap-2 rounded-[10px] bg-white/75 px-4 py-2.5 text-xs font-medium text-[#3d4a5c]"
          >
            <pill.icon className="h-4 w-4 text-[#6ea43f]" aria-hidden />
            <span>{pill.label}</span>
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}
