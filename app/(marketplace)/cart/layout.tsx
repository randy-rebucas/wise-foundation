import type { Metadata } from "next";
import { ROBOTS_NOINDEX } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Cart",
  robots: ROBOTS_NOINDEX,
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
