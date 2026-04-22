"use client";

import { useSession } from "next-auth/react";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Header({ title, subtitle, action }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-3 border-b bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:gap-4 sm:px-6 sm:py-0">
      <div className="min-w-0 flex-1 basis-[min(100%,12rem)]">
        <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
        )}
      </div>
      <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
        {action && <div className="shrink-0">{action}</div>}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="h-9 w-48 pl-9 md:w-64" />
        </div>
        <Button variant="ghost" size="icon" className="relative shrink-0">
          <Bell className="h-5 w-5" />
        </Button>
        <div className="hidden min-w-0 text-right sm:block">
          <p className="max-w-[10rem] truncate text-sm font-medium md:max-w-none">{session?.user?.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {session?.user?.role?.replace(/_/g, " ")}
          </p>
        </div>
      </div>
    </header>
  );
}
