"use client";

import { create } from "zustand";
import { User } from "@/types/User";

type ThemeMode = "dark" | "light" | "system";
type Period = "24h" | "7d" | "30d" | "90d";

interface UserState {
  user: User | null;
  theme: ThemeMode;
  loading: boolean;

  period: Period;
  sort: string;

  viewMode: "card" | "compact";
  isTodayMode: boolean;
  sourceFilters: string[];
  categoryFilters: string[];
  searchTerm: string;

  setUser: (u: User | null) => void;
  setTheme: (t: ThemeMode) => void;

  setPeriod: (p: Period) => void;
  setSort: (s: string) => void;

  setViewMode: (v: "card" | "compact") => void;
  setTodayMode: (v: boolean) => void;
  setSourceFilters: (arr: string[]) => void;
  setCategoryFilters: (arr: string[]) => void;
  setSearchTerm: (s: string) => void;

  loadUser: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  theme: "system",
  loading: true,

  period: "24h",
  sort: "Legfrissebb",

  viewMode: "card",
  isTodayMode: false,
  sourceFilters: [],
  categoryFilters: [],
  searchTerm: "",

  setUser: (u) => set({ user: u }),
  setTheme: (t) => set({ theme: t }),

  setPeriod: (p) => set({ period: p }),
  setSort: (s) => set({ sort: s }),

  // ⭐⭐⭐ VIEWMODE TARTÓS MENTÉSE
  setViewMode: (v) => {
    try {
      localStorage.setItem("viewMode", v);
    } catch {}
    set({ viewMode: v });
  },

  setTodayMode: (v) => set({ isTodayMode: v }),
  setSourceFilters: (arr) => set({ sourceFilters: arr }),
  setCategoryFilters: (arr) => set({ categoryFilters: arr }),
  setSearchTerm: (s) => set({ searchTerm: s }),

  loadUser: async () => {
    // ⭐⭐⭐ VIEWMODE BEOLVASÁSA INDULÁSKOR
    try {
      const savedView = localStorage.getItem("viewMode");
      if (savedView === "card" || savedView === "compact") {
        set({ viewMode: savedView });
      }
    } catch {}

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
