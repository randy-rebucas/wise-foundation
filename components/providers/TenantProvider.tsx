"use client";

import { createContext, useContext } from "react";

interface AppSettings {
  currency: string;
  timezone: string;
  memberDiscount: number;
  lowStockThreshold: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  currency: "PHP",
  timezone: "Asia/Manila",
  memberDiscount: 10,
  lowStockThreshold: 10,
};

const AppSettingsContext = createContext<AppSettings>(DEFAULT_SETTINGS);

export function TenantProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value?: Partial<AppSettings>;
}) {
  return (
    <AppSettingsContext.Provider value={{ ...DEFAULT_SETTINGS, ...value }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useTenant(): AppSettings {
  return useContext(AppSettingsContext);
}
