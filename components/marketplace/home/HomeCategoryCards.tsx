"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MARKETPLACE_CATEGORY_CARDS } from "@/lib/marketplace/categories";
import { cloudinaryTransformedUrl } from "@/lib/utils/cloudinaryTransform";
import { cn } from "@/lib/utils";
import { isRemoteUrl } from "./shared";
import type { ProductCategory } from "@/types";

type HomeCategoryCardsProps = {
  selected: ProductCategory | "";
  onSelect: (value: ProductCategory | "") => void;
  images?: Partial<Record<ProductCategory, string>> | null;
};

export function HomeCategoryCards({ selected, onSelect, images }: HomeCategoryCardsProps) {
  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#6ea43f]">
            Shop by category
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-yellowtail)] text-3xl font-normal text-[#1f2a44]">
            Find your next Glowish ritual
          </h2>
        </div>
        <Button
          variant="outline"
          className="rounded-[10px] border-[#e5e0f0] bg-white shadow-sm hover:bg-[#faf7fd]"
          asChild
        >
          <Link href="/categories">
            View all categories
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MARKETPLACE_CATEGORY_CARDS.map((card) => {
          const imageUrl = images?.[card.value];
          return (
            <button
              key={card.value}
              type="button"
              onClick={() => onSelect(card.value)}
              aria-pressed={selected === card.value}
              className={cn(
                "group flex min-h-[190px] cursor-pointer overflow-hidden rounded-[10px] border bg-white text-left shadow-[0_2px_12px_rgba(94,70,135,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(94,70,135,0.12)]",
                selected === card.value
                  ? "border-[#6ea43f]/50 ring-2 ring-[#6ea43f]/20"
                  : "border-[#ece7f5]"
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col p-4">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br ${card.homeColor}`}
                >
                  <card.icon className="h-5 w-5" aria-hidden />
                </span>
                <p className="mt-3 font-semibold text-[#1f2a44]">{card.label}</p>
                <p className="mt-1 text-xs leading-5 text-[#64748b]">{card.description}</p>
                <span
                  className="mt-auto flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#6ea43f]/35 bg-white text-[#477d34] transition group-hover:translate-x-0.5 group-hover:bg-[#6ea43f]/10"
                  aria-hidden
                >
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
              <div
                className={cn(
                  "relative w-[45%] shrink-0 overflow-hidden",
                  !imageUrl && `bg-gradient-to-br ${card.accent}`
                )}
              >
                {imageUrl ? (
                  isRemoteUrl(imageUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cloudinaryTransformedUrl(imageUrl, { width: 400, crop: "limit" })}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <Image
                      src={imageUrl}
                      alt=""
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="200px"
                    />
                  )
                ) : (
                  <card.icon className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-white/80" aria-hidden />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
