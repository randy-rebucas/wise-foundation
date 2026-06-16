"use client";

import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function Header({ title, subtitle, action, className }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex min-h-16 shrink-0 flex-wrap items-center gap-3 border-b bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:gap-4 sm:px-6 sm:py-0",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 basis-[min(100%,12rem)] items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
        {action && <div className="shrink-0">{action}</div>}
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
