"use client";

import { useState } from "react";
import Link from "next/link";
import { Globe2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/Sidebar";
import type { SidebarUser } from "@/components/layout/Sidebar";
import { TenantProvider } from "@/components/providers/TenantProvider";
import type { PublicAppSettings } from "@/lib/types/appSettings";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  initialUser: SidebarUser;
  tenantSettings: PublicAppSettings;
  children: React.ReactNode;
}

export function DashboardShell({ initialUser, tenantSettings, children }: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <TenantProvider value={tenantSettings}>
      <div className="flex h-[100dvh] overflow-hidden bg-background">
      <div className="flex md:hidden fixed top-0 left-0 right-0 z-[35] h-14 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-3 sm:gap-3 sm:px-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm tracking-wide truncate" style={{ color: "hsl(var(--glowish-gold))" }}>
            {tenantSettings.appName}
          </p>
          <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wider">
            {tenantSettings.appTagline}
          </p>
        </div>
        <Button variant="outline" size="icon" className="shrink-0" asChild aria-label="View marketplace">
          <Link href="/">
            <Globe2 className="h-5 w-5" />
          </Link>
        </Button>
      </div>

      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[38] bg-black/60 md:hidden"
          aria-label="Close navigation menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <Sidebar
        initialUser={initialUser}
        className={cn(
          "fixed z-[40] md:relative md:z-0 h-[100dvh] md:h-auto md:min-h-screen shrink-0",
          "transition-transform duration-200 ease-out md:translate-x-0",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        onNavigate={() => setMobileNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden pt-14 md:pt-0">
        <div className="hidden shrink-0 items-center justify-end border-b bg-muted/25 px-4 py-2 md:flex">
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link href="/">
              <Globe2 className="h-4 w-4" />
              View marketplace
            </Link>
          </Button>
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">{children}</main>
      </div>
    </div>
    </TenantProvider>
  );
}
