"use client";

import Image from "next/image";
import { Package } from "lucide-react";

function isRemote(url: string) {
  return /^https?:\/\//i.test(url);
}

export function OrderThumbnail({ url, name }: { url: string | null; name: string }) {
  if (!url) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-400">
        <Package className="h-6 w-6" aria-hidden />
      </div>
    );
  }

  if (isRemote(url)) {
    return (
      <div
        className="h-14 w-14 shrink-0 rounded-xl bg-cover bg-center"
        style={{ backgroundImage: `url(${url})` }}
        role="img"
        aria-label={name}
      />
    );
  }

  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
      <Image src={url} alt={name} fill className="object-cover" sizes="56px" />
    </div>
  );
}
