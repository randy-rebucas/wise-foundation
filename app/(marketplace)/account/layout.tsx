"use client";

import { usePathname } from "next/navigation";
import { AccountShell } from "@/components/marketplace/account/AccountShell";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/account/login" || pathname === "/account/register";

  if (isAuthPage) {
    return <>{children}</>;
  }

  return <AccountShell>{children}</AccountShell>;
}
