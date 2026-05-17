"use client";

import Link from "next/link";
import { AppLogo, type AppLogoSize } from "@/components/branding/AppLogo";
import { useTenant } from "@/components/providers/TenantProvider";
import { APP_LOGO_SRC } from "@/lib/constants/branding";
import { cn } from "@/lib/utils";

export type AppBrandTheme =
  | "sidebar"
  | "dashboard-mobile"
  | "auth"
  | "account"
  | "marketplace"
  | "setup";

const THEME_STYLES: Record<
  AppBrandTheme,
  { name: string; tagline: string; logoSize: AppLogoSize }
> = {
  sidebar: {
    logoSize: "xl",
    name: "font-bold text-sm tracking-wide truncate text-[hsl(var(--glowish-gold))]",
    tagline:
      "text-[10px] text-sidebar-foreground opacity-60 tracking-widest uppercase truncate",
  },
  "dashboard-mobile": {
    logoSize: "lg",
    name: "font-bold text-sm tracking-wide truncate text-[hsl(var(--glowish-gold))]",
    tagline: "text-[10px] text-muted-foreground truncate uppercase tracking-wider",
  },
  auth: {
    logoSize: "xl",
    name: "font-bold text-lg tracking-wide leading-none text-[hsl(var(--glowish-blue))]",
    tagline: "text-[10px] text-muted-foreground tracking-widest uppercase",
  },
  account: {
    logoSize: "xl",
    name: "font-bold text-lg tracking-wide leading-none text-primary",
    tagline: "text-xs text-muted-foreground",
  },
  marketplace: {
    logoSize: "xl",
    name: "font-semibold tracking-tight truncate",
    tagline: "text-xs font-normal text-muted-foreground truncate max-w-[200px] hidden md:block",
  },
  setup: {
    logoSize: "2xl",
    name: "font-bold text-3xl tracking-tight",
    tagline: "text-muted-foreground",
  },
};

export interface AppBrandProps {
  appName?: string;
  appTagline?: string;
  theme?: AppBrandTheme;
  showTagline?: boolean;
  className?: string;
  href?: string;
  priority?: boolean;
}

export function AppBrand({
  appName: appNameProp,
  appTagline: appTaglineProp,
  theme = "sidebar",
  showTagline = true,
  className,
  href,
  priority,
}: AppBrandProps) {
  const tenant = useTenant();
  const appName = appNameProp ?? tenant.appName;
  const appTagline = appTaglineProp ?? tenant.appTagline;
  const styles = THEME_STYLES[theme];
  const showText = !APP_LOGO_SRC;

  const inner = (
    <>
      <AppLogo size={styles.logoSize} priority={priority} />
      {showText ? (
        <div className="min-w-0">
          <p className={styles.name}>{appName}</p>
          {showTagline && appTagline ? (
            <p className={styles.tagline}>{appTagline}</p>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const rootClass = cn("flex min-w-0 items-center gap-3", className);

  if (href) {
    return (
      <Link href={href} className={cn(rootClass, "hover:opacity-90 transition-opacity")}>
        {inner}
      </Link>
    );
  }

  return <div className={rootClass}>{inner}</div>;
}
