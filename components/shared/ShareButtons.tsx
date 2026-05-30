"use client";

import { useState } from "react";
import { Check, Copy, Link2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
  className?: string;
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function ShareButtons({ url, title, description, image, className }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const absoluteUrl = url.startsWith("http")
    ? url
    : `${typeof window !== "undefined" ? window.location.origin : ""}${url}`;

  const shareText = description ? `${title} — ${description}` : title;

  const platforms = [
    {
      label: "X / Twitter",
      Icon: XIcon,
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(absoluteUrl)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      label: "Facebook",
      Icon: FacebookIcon,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(absoluteUrl)}`,
    },
    {
      label: "WhatsApp",
      Icon: WhatsAppIcon,
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${absoluteUrl}`)}`,
    },
  ];

  async function handleNativeShare() {
    if (!navigator.share) return;
    if (image && navigator.canShare) {
      try {
        const res = await fetch(image);
        const blob = await res.blob();
        const ext = blob.type.includes("png") ? "png" : "jpg";
        const file = new File([blob], `share.${ext}`, { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title, text: description, url: absoluteUrl, files: [file] });
          return;
        }
      } catch {
        // fall through to URL-only share
      }
    }
    await navigator.share({ title, text: description, url: absoluteUrl }).catch(() => {});
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(absoluteUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#2A4C6A]/55">
        <Share2 className="h-3.5 w-3.5" />
        Share
      </span>

      {/* Native share button — visible on mobile when API is available */}
      {typeof navigator !== "undefined" && "share" in navigator && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleNativeShare}
          className="h-8 gap-1.5 rounded-xl border-white/70 bg-white/60 px-3 text-xs sm:hidden"
        >
          <Link2 className="h-3.5 w-3.5" />
          Share
        </Button>
      )}

      {/* Platform icon buttons — visible on desktop */}
      <div className="hidden items-center gap-1.5 sm:flex">
        {platforms.map(({ label, Icon, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share on ${label}`}
            title={`Share on ${label}`}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/70 bg-white/60 text-[#2A4C6A]/70 shadow-sm backdrop-blur transition hover:bg-white/80 hover:text-[#3c2e60] hover:shadow-md"
          >
            <Icon />
          </a>
        ))}
      </div>

      {/* Copy link */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="h-8 gap-1.5 rounded-xl border-white/70 bg-white/60 px-3 text-xs"
        aria-label="Copy link"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-[#6ea43f]" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copy link
          </>
        )}
      </Button>
    </div>
  );
}
