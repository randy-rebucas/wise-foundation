import { cn } from "@/lib/utils";
import {
  MARKETPLACE_PAGE_FONT,
  MARKETPLACE_PAGE_INNER,
  MARKETPLACE_PAGE_OUTER,
} from "@/lib/marketplace/pageLayout";

type Props = {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  gap?: "space-y-5" | "space-y-6" | "space-y-8" | "";
};

export function MarketplacePageShell({
  children,
  className,
  innerClassName,
  gap = "space-y-6",
}: Props) {
  return (
    <div className={cn(MARKETPLACE_PAGE_OUTER, MARKETPLACE_PAGE_FONT, className)}>
      <div className={cn(MARKETPLACE_PAGE_INNER, gap, innerClassName)}>{children}</div>
    </div>
  );
}
