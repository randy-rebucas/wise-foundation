import type { Metadata } from "next";
import { AccountLayoutClient } from "@/components/marketplace/account/AccountLayoutClient";
import { ROBOTS_NOINDEX } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Account",
  robots: ROBOTS_NOINDEX,
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountLayoutClient>{children}</AccountLayoutClient>;
}
