"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ChevronRight, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ACCOUNT_NAV, isAccountNavActive } from "@/components/marketplace/account/accountNav";
import { UserAvatar } from "@/components/marketplace/account/UserAvatar";
import { useRequireCustomer } from "@/components/marketplace/account/useRequireCustomer";
import { useMarketplaceNotificationReadsStore } from "@/store/marketplaceNotificationReadsStore";

type ProfileSummary = {
  name: string;
  email: string;
  avatar: string | null;
};

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, user } = useRequireCustomer();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const isNotificationRead = useMarketplaceNotificationReadsStore((s) => s.isRead);

  const loadProfile = useCallback(async () => {
    try {
      const [dashRes, notifRes] = await Promise.all([
        fetch("/api/account/dashboard"),
        fetch("/api/account/notifications"),
      ]);
      const json = await dashRes.json();
      if (dashRes.ok && json.success) {
        const p = json.data.profile as ProfileSummary;
        setProfile(p);
      }
      const notifJson = await notifRes.json();
      if (notifRes.ok && notifJson.success) {
        const items = notifJson.data as { id: string }[];
        setUnreadNotifications(items.filter((n) => !isNotificationRead(n.id)).length);
      }
    } catch {
      /* sidebar falls back to session */
    }
  }, [isNotificationRead]);

  useEffect(() => {
    if (ready) {
      queueMicrotask(() => {
        void loadProfile();
      });
    }
  }, [ready, loadProfile]);

  if (!ready || !user) {
    return (
      <div className="-mx-4 -my-8 flex justify-center py-24 font-[family-name:var(--font-plus-jakarta-sans)]">
        <Loader2 className="h-8 w-8 animate-spin text-[#6ea43f]" />
      </div>
    );
  }

  const displayName = profile?.name ?? user.name ?? "Guest";
  const firstName = displayName.split(" ")[0] ?? "Guest";
  const email = profile?.email ?? user.email ?? "";

  return (
    <div className="-mx-4 -my-8 min-h-full px-4 py-8 font-[family-name:var(--font-plus-jakarta-sans)] text-[#2A4C6A]">
      <section className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-white/65 bg-white/55 shadow-[0_24px_80px_rgba(94,70,135,0.16)] backdrop-blur-xl">
        <div className="grid lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="border-b border-white/60 bg-white/40 p-5 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-3 border-b border-white/60 pb-5">
              <div className="relative h-14 w-14 overflow-hidden rounded-full ring-2 ring-white/80">
                <UserAvatar name={displayName} avatar={profile?.avatar ?? null} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#1e3157]">Hello, {firstName}</p>
                <p className="truncate text-xs text-[#2A4C6A]/65">{email}</p>
              </div>
            </div>

            <nav className="mt-4 flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
              {ACCOUNT_NAV.map((item) => {
                const active = isAccountNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition lg:shrink",
                      active
                        ? "bg-violet-100/80 text-violet-700"
                        : "text-[#2A4C6A]/75 hover:bg-white/60 hover:text-[#1e3157]"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        active ? "bg-violet-200/80 text-violet-700" : "bg-white/60 text-[#6ea43f]"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.href === "/account/notifications" && unreadNotifications > 0 ? (
                      <span className="rounded-full bg-pink-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {unreadNotifications}
                      </span>
                    ) : null}
                    <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                  </Link>
                );
              })}
            </nav>

            <Button
              type="button"
              variant="ghost"
              className="mt-6 w-full justify-start rounded-xl text-[#2A4C6A]/75 hover:bg-white/60 hover:text-[#1e3157]"
              onClick={() => void signOut({ callbackUrl: "/" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </aside>

          <div className="p-5 sm:p-7">{children}</div>
        </div>
      </section>
    </div>
  );
}
