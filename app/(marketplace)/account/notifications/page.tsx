"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Loader2, Package } from "lucide-react";
import { AccountPageHeader } from "@/components/marketplace/account/AccountPageHeader";
import { Button } from "@/components/ui/button";
import { useMarketplaceNotificationReadsStore } from "@/store/marketplaceNotificationReadsStore";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string;
  createdAt: string;
};

function formatWhen(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AccountNotificationsPage() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const markRead = useMarketplaceNotificationReadsStore((s) => s.markRead);
  const markAllRead = useMarketplaceNotificationReadsStore((s) => s.markAllRead);
  const isRead = useMarketplaceNotificationReadsStore((s) => s.isRead);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/account/notifications");
      const json = await res.json();
      if (res.ok && json.success) {
        setItems(json.data as Notification[]);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const unreadCount = (items ?? []).filter((n) => !isRead(n.id)).length;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AccountPageHeader
          title="Notifications"
          description="Order updates and account activity."
        />
        {items && items.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-[10px] border-white/70 bg-white/65"
            onClick={() => markAllRead(items.map((n) => n.id))}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        ) : null}
      </div>

      {unreadCount > 0 ? (
        <p className="mt-2 text-xs font-semibold text-violet-600">{unreadCount} unread</p>
      ) : null}

      <div className="mt-6">
        {items === null ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#6ea43f]" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[10px] border border-white/65 bg-white/60 p-10 text-center shadow-sm">
            <Bell className="mx-auto h-10 w-10 text-[#6ea43f]" />
            <p className="mt-4 text-sm text-[#2A4C6A]/75">No notifications yet.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((n) => {
              const read = isRead(n.id);
              return (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "flex gap-4 rounded-[10px] border border-white/65 p-4 shadow-sm transition hover:bg-white/70",
                      read ? "bg-white/45 opacity-80" : "bg-white/65"
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                      <Package className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#1e3157]">{n.title}</p>
                      <p className="mt-1 text-sm text-[#2A4C6A]/75">{n.message}</p>
                      <p className="mt-2 text-xs text-[#2A4C6A]/55">{formatWhen(n.createdAt)}</p>
                    </div>
                    {!read ? (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-pink-500" />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
