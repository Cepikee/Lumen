"use client";

import { useEffect, useState } from "react";
import { User } from "@/types/User";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔥 A user theme külön state-ben is elérhető
  const [theme, setTheme] = useState<"dark" | "light" | "system">("system");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json();

        if (data.loggedIn) {
          const u = data.user as User;
          setUser(u);

          // 🔥 Ha van theme mező, beállítjuk
          if (u.theme) {
            setTheme(u.theme as "dark" | "light" | "system");
          }
        } else {
          setUser(null);
          setTheme("system"); // alapértelmezett
        }
      } catch (err) {
        console.error("Auth error:", err);
        setUser(null);
        setTheme("system");
      }

      setLoading(false);
    }

    load();
  }, []);

  return { user, theme, loading, setTheme };
}
