"use client";

import { create } from "zustand";
import { User } from "@/types/User";

type ThemeMode = "dark" | "light" | "system";

interface UserState {
  user: User | null;
  theme: ThemeMode;
  loading: boolean;

  setUser: (u: User | null) => void;
  setTheme: (t: ThemeMode) => void;
  loadUser: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  theme: "system",
  loading: true,

  setUser: (u) => set({ user: u }),
  setTheme: (t) => set({ theme: t }),

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
