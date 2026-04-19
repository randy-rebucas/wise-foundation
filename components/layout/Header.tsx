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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
      <div className="flex-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {action && <div className="shrink-0">{action}</div>}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-9 w-64 h-9" />
        </div>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
        </Button>
        <div className="text-right hidden md:block">
          <p className="text-sm font-medium">{session?.user?.name}</p>
          <p className="text-xs text-muted-foreground">{session?.user?.role?.replace(/_/g, " ")}</p>
        </div>
      </div>
    </header>
  );
}
