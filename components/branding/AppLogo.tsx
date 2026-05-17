import Image from "next/image";
import { APP_LOGO_ALT, APP_LOGO_SRC } from "@/lib/constants/branding";
import { cn } from "@/lib/utils";

const LOGO_SIZES = {
  xs: { className: "h-10 w-10", px: 40 },
  sm: { className: "h-12 w-12", px: 48 },
  md: { className: "h-16 w-16", px: 64 },
  lg: { className: "h-20 w-20", px: 80 },
  xl: { className: "h-28 w-28", px: 112 },
  "2xl": { className: "h-32 w-32 sm:h-36 sm:w-36", px: 144 },
} as const;

export type AppLogoSize = keyof typeof LOGO_SIZES;

export interface AppLogoProps {
  size?: AppLogoSize;
  className?: string;
  /** When true, loads eagerly without emitting a preload link. */
  priority?: boolean;
  alt?: string;
}

export function AppLogo({ size = "md", className, priority, alt = APP_LOGO_ALT }: AppLogoProps) {
  const { className: box, px } = LOGO_SIZES[size];

  return (
    <span className={cn("relative inline-block shrink-0", box, className)}>
      <Image
        src={APP_LOGO_SRC}
        alt={alt}
        fill
        className="object-contain"
        sizes={`${px}px`}
        loading={priority ? "eager" : undefined}
      />
    </span>
  );
}
