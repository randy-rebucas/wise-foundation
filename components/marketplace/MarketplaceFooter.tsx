"use client";

import Link from "next/link";
import { Heart, Mail, MessageCircle } from "lucide-react";
import { AppLogo } from "@/components/branding/AppLogo";
import { useTenant } from "@/components/providers/TenantProvider";
import { MARKETPLACE_FOOTER_COLUMNS } from "@/lib/marketplace/footerLinks";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Constrains footer content (e.g. to match a page's content column) without affecting the background. */
  innerClassName?: string;
  showSocial?: boolean;
};

export function MarketplaceFooter({ className, innerClassName, showSocial = false }: Props) {
  const { appName, appTagline } = useTenant();
  const year = new Date().getFullYear();
  const blurb =
    appTagline?.trim() ||
    "Glow naturally, wish beautifully. Premium skincare for your radiant confidence.";

  return (
    <footer
      className={cn(
        "overflow-hidden rounded-[10px] border border-white/60 bg-[#f6def8]/55 shadow-[0_18px_60px_rgba(94,70,135,0.16)] backdrop-blur-xl",
        className
      )}
    >
      <div className={cn("w-full", innerClassName)}>
      <div className="grid gap-6 border-b border-white/55 p-5 sm:p-7 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <AppLogo size="lg" />
          <p className="max-w-xs text-sm leading-6 text-[#2A4C6A]/75">{blurb}</p>
          {showSocial ? (
            <div className="flex gap-2 text-[#2B6B56]">
              {[Heart, MessageCircle, Mail].map((Icon, index) => (
                <span
                  key={index}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6ea43f] text-white shadow-sm"
                  aria-hidden
                >
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {MARKETPLACE_FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="font-semibold text-[#3c2e60]">{column.title}</h3>
            <ul className="mt-4 space-y-2 text-sm text-[#2A4C6A]/75">
              {column.links.map((link) => (
                <li key={`${column.title}-${link.href}-${link.label}`}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-[#1e3157] hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 px-5 py-4 text-center text-xs text-[#2A4C6A]/65 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <span>
          © {year} {appName}. All rights reserved.
        </span>
        <span>
          Made with <span className="text-[#FF33CC]">♥</span> for your glow.
        </span>
      </div>
      </div>
    </footer>
  );
}
