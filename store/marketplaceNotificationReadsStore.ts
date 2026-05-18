"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NotificationReadsState {
  readIds: string[];
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
  isRead: (id: string) => boolean;
}

export const useMarketplaceNotificationReadsStore = create<NotificationReadsState>()(
  persist(
    (set, get) => ({
      readIds: [],
      markRead: (id) =>
        set((s) =>
          s.readIds.includes(id) ? s : { readIds: [...s.readIds, id] }
        ),
      markAllRead: (ids) =>
        set((s) => ({
          readIds: [...new Set([...s.readIds, ...ids])],
        })),
      isRead: (id) => get().readIds.includes(id),
    }),
    { name: "glowish-marketplace-notification-reads" }
  )
);
