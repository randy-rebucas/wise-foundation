"use client";

import { useEffect, useState } from "react";
import type { PublicAppSettings } from "@/lib/types/appSettings";
import { MarketplaceShell } from "@/components/marketplace/MarketplaceShell";
import { Skeleton } from "@/components/ui/skeleton";

export function MarketplaceLayoutClient({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Partial<PublicAppSettings> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/marketplace/settings");
        const json = (await res.json()) as { success?: boolean; data?: PublicAppSettings };
        if (!cancelled && json.success && json.data) setTenant(json.data);
      } catch {
        /* TenantProvider merges defaults */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-32" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 py-8">{children}</main>
      </div>
    );
  }

  return <MarketplaceShell tenant={tenant ?? {}}>{children}</MarketplaceShell>;
}
