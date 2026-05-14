import { MarketplaceLayoutClient } from "@/components/marketplace/MarketplaceLayoutClient";

export default function MarketplaceGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketplaceLayoutClient>{children}</MarketplaceLayoutClient>;
}
