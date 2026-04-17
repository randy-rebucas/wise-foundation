import { create } from "zustand";
import type { SessionUser } from "@/types";

interface SessionStore {
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
  currentBranchId: string | null;
  setCurrentBranch: (branchId: string | null) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  currentBranchId: null,
  setCurrentBranch: (branchId) => set({ currentBranchId: branchId }),
}));
