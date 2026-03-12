"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
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

/**
 * NOTE:
 * - Persisting the entire state avoids TypeScript issues with `partialize` signatures
 *   across different zustand versions. If you want to persist only a subset, you can
 *   reintroduce `partialize` but you may need to adjust generic types depending on
 *   your zustand version.
 *
 * - setTheme immediately updates document.documentElement.classList for Tailwind
 *   `darkMode: "class"` setups so the UI reflects the choice without visual flicker.
 */

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
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

      // setTheme: update state AND immediately apply/remove the html.dark class (Tailwind class mode)
      setTheme: (t: ThemeMode) => {
        try {
          if (typeof document !== "undefined") {
            if (t === "dark") {
              document.documentElement.classList.add("dark");
            } else if (t === "light") {
              document.documentElement.classList.remove("dark");
            } else {
              // system: remove explicit class so media query can take effect
              document.documentElement.classList.remove("dark");
            }
          }
        } catch {}
        set({ theme: t });
      },

      setPeriod: (p) => set({ period: p }),
      setSort: (s) => set({ sort: s }),

      // VIEWMODE TARTÓS MENTÉSE (backward compat + persisted by zustand)
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
        // VIEWMODE BEOLVASÁSA INDULÁSKOR (backward compat)
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
            // don't overwrite a persisted theme here; keep current theme
            set({ user: null, loading: false });
            return;
          }

          let data: any;
          try {
            data = JSON.parse(text);
          } catch {
            set({ user: null, loading: false });
            return;
          }

          if (data.loggedIn) {
            // Respect any already persisted client theme; only use server user.theme as fallback
            const currentTheme = get().theme;
            const resolvedTheme =
              currentTheme && currentTheme !== "system" ? currentTheme : data.user?.theme || "system";

            // Apply html class immediately according to resolvedTheme
            try {
              if (typeof document !== "undefined") {
                if (resolvedTheme === "dark") {
                  document.documentElement.classList.add("dark");
                } else if (resolvedTheme === "light") {
                  document.documentElement.classList.remove("dark");
                } else {
                  document.documentElement.classList.remove("dark");
                }
              }
            } catch {}

            set({
              user: data.user,
              theme: resolvedTheme,
              loading: false,
            });
          } else {
            set({
              user: null,
              loading: false,
            });
          }
        } catch {
          set({
            user: null,
            loading: false,
          });
        }
      },
    }),
    {
      name: "utom-store", // localStorage key
      // Persist the whole state to avoid type incompatibilities across zustand versions.
      // If you prefer to persist only a subset, reintroduce `partialize` and adjust types.
    }
  )
);
