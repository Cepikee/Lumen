"use client";

import { useEffect, useState } from "react";
import HiradoLayout2026 from "@/components/HiradoLayout2026";
import { useUserStore } from "@/store/useUserStore";

export default function HiradoClient({ videoId }: { videoId?: string }) {
  const [data, setData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const theme = useUserStore((s) => s.theme);

  // 🔥 Téma alkalmazása
  useEffect(() => {
    if (!theme) return;

    document.documentElement.classList.remove("light", "dark");

    if (theme === "system") {
      const system = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      document.documentElement.classList.add(system);
    } else {
      document.documentElement.classList.add(theme);
    }
  }, [theme]);

  // 🔥 Híradó adat lekérése
  useEffect(() => {
    async function load() {
      try {
        let url = "/api/hirado/today";
        if (videoId) url = `/api/hirado/by-id?videoId=${videoId}`;

        const res = await fetch(url, {
          cache: "no-store",
          credentials: "include",
        });

        const text = await res.text();
        if (!text) return;

        const json = JSON.parse(text);

        // ❌ NINCS több fileUrl vagy file_url
        setData(json);
      } catch (err) {
        console.error("Híradó adat hiba:", err);
      }
    }

    load();
  }, [videoId]);

  // 🔥 Felhasználó lekérése
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });

        const text = await res.text();
        if (!text) {
          setUser(null);
          return;
        }

        let json;
        try {
          json = JSON.parse(text);
        } catch {
          setUser(null);
          return;
        }

        setUser(json.user ?? null);
      } catch (err) {
        console.error("Felhasználó lekérési hiba:", err);
        setUser(null);
      }
    }

    loadUser();
  }, []);

  if (!data || !user) {
    return <div className="p-6">Betöltés...</div>;
  }

  return <HiradoLayout2026 video={data.video} user={user} />;
}
