"use client";

import { useEffect, useState } from "react";
import { User } from "@/types/User";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [theme, setTheme] = useState<"dark" | "light" | "system">("system");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        // A lejárt/hiányzó session valóban kijelentkezett állapot,
        // egy 5xx vagy hálózati hiba viszont nem bizonyítja ezt.
        if (!res.ok) {
          if (res.status === 401) {
            setUser(null);
            setTheme("system");
          }
          // A failed auth probe must not leave consumers in an endless
          // loading state. A transient 5xx still preserves the current user,
          // but the request itself is finished.
          setLoading(false);
          return;
        }

        // 🔥 1) Olvassuk be raw textként
        const text = await res.text();

        // 🔥 2) Ha üres → nincs JSON → nincs hiba
        if (!text) {
          console.warn("⚠️ /api/auth/me üres választ adott (useUser)");
          setUser(null);
          setTheme("system");
          setLoading(false);
          return;
        }

        // 🔥 3) Ha nem JSON → ne dobjon hibát
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          console.warn("⚠️ /api/auth/me nem JSON választ adott (useUser):", text);
          setUser(null);
          setTheme("system");
          setLoading(false);
          return;
        }

        // 🔥 4) Ha minden oké → állítsuk be
        if (data.loggedIn === true && data.user && typeof data.user === "object") {
          const u = data.user as User;
          setUser(u);

          if (u.theme) {
            setTheme(u.theme as "dark" | "light" | "system");
          }
        } else {
          setUser(null);
          setTheme("system");
        }
      } catch (err) {
        console.error("Auth error (useUser):", err);
        setUser(null);
        setTheme("system");
      }

      setLoading(false);
    }

    load();
  }, []);

  return { user, theme, loading, setTheme };
}
