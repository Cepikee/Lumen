"use client";

import { create } from "zustand";
import { User } from "@/types/User";

type ThemeMode = "dark" | "light" | "system";
type Period = "24h" | "7d" | "30d" | "90d";

interface UserState {
  user: User | null;
  theme: ThemeMode;
  loading: boolean;

  // ⭐ ÚJ: Insights állapotok
  period: Period;
  sort: string;

  setUser: (u: User | null) => void;
  setTheme: (t: ThemeMode) => void;

  // ⭐ ÚJ: Insights setterek
  setPeriod: (p: Period) => void;
  setSort: (s: string) => void;

  loadUser: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  theme: "system",
  loading: true,

  // ⭐ ÚJ default értékek
  period: "24h",
  sort: "Legfrissebb",

  setUser: (u) => set({ user: u }),
  setTheme: (t) => set({ theme: t }),

  // ⭐ ÚJ setterek
  setPeriod: (p) => set({ period: p }),
  setSort: (s) => set({ sort: s }),

  loadUser: async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });

      const text = await res.text();
      if (!text) {
        set({ user: null, theme: "system", loading: false });
        return;
      }

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        set({ user: null, theme: "system", loading: false });
        return;
      }

      if (data.loggedIn) {
        set({
          user: data.user,
          theme: data.user.theme || "system",
          loading: false,
        });
      } else {
        set({
          user: null,
          theme: "system",
          loading: false,
        });
      }
    } catch {
      set({
        user: null,
        theme: "system",
        loading: false,
      });
    }
  },
}));
