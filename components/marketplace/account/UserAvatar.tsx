"use client";

import Image from "next/image";

function isRemote(url: string) {
  return /^https?:\/\//i.test(url);
}

export function UserAvatar({ name, avatar }: { name: string; avatar: string | null }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (avatar) {
    if (isRemote(avatar)) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="h-full w-full object-cover" />
      );
    }
    return <Image src={avatar} alt="" fill className="object-cover" sizes="56px" />;
  }

  return (
    <span className="flex h-full w-full items-center justify-center bg-violet-100 text-sm font-semibold text-violet-700">
      {initials || "?"}
    </span>
  );
}
