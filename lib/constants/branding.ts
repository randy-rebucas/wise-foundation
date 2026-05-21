/** Default app logo served from `/public/logo.png`. */
export const APP_LOGO_SRC = "/logo.png";

export const APP_LOGO_ALT = "Glowish";

/** True when admin uploaded or assigned a logo in application settings. */
export function hasCustomAppLogo(appLogoUrl?: string | null): boolean {
  return !!appLogoUrl?.trim();
}

/** Resolved logo src for UI (custom tenant logo or default). */
export function resolveAppLogoSrc(appLogoUrl?: string | null): string {
  const trimmed = appLogoUrl?.trim();
  return trimmed || APP_LOGO_SRC;
}
