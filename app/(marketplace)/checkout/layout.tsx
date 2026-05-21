import type { Metadata } from "next";
import { ROBOTS_NOINDEX } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Checkout",
  robots: ROBOTS_NOINDEX,
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
