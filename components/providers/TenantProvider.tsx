"use client";

import { createContext, useCallback, useContext } from "react";
import type { PublicAppSettings } from "@/lib/types/appSettings";
import { formatCurrency, formatDateInTimezone, formatDateTimeInTimezone } from "@/lib/utils";

export const DEFAULT_PUBLIC_APP_SETTINGS: PublicAppSettings = {
  appName: "Glowish",
  appTagline: "POS & online store",
  currency: "PHP",
  timezone: "Asia/Manila",
  memberDefaultDiscountPercent: 10,
  defaultLowStockThreshold: 10,
  receiptFooter: "",
  imageUploadEnabled: false,
};

const TenantContext = createContext<PublicAppSettings>(DEFAULT_PUBLIC_APP_SETTINGS);

export function TenantProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value?: Partial<PublicAppSettings> | null;
}) {
  const merged: PublicAppSettings = { ...DEFAULT_PUBLIC_APP_SETTINGS, ...(value ?? {}) };
  return <TenantContext.Provider value={merged}>{children}</TenantContext.Provider>;
}

/** Application / tenant settings (currency, timezone, branding, POS defaults). */
export function useTenant(): PublicAppSettings {
  return useContext(TenantContext);
}

export function useFormatCurrency() {
  const { currency } = useTenant();
  return useCallback((amount: number) => formatCurrency(amount, currency), [currency]);
}

export function useFormatDateTime() {
  const { timezone } = useTenant();
  return useCallback((date: Date | string) => formatDateTimeInTimezone(date, timezone), [timezone]);
}

export function useFormatDate() {
  const { timezone } = useTenant();
  return useCallback((date: Date | string) => formatDateInTimezone(date, timezone), [timezone]);
}
