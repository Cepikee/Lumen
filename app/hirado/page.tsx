"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import HiradoLayout2026 from "@/components/HiradoLayout2026";

// 🔥 A HELYES STORE IMPORT
import { useUserStore } from "@/store/useUserStore";


export default function HiradoPage() {
  const searchParams = useSearchParams();
  const videoId = searchParams.get("video");

  const [data, setData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  // 🔥 TÉMA A USER STORE-BÓL
  const theme = useUserStore((s) => s.theme);

  // 🔥 TÉMA ALKALMAZÁSA A /hirado OLDALON
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

  // 🔥 Híradó adat lekérése (mai vagy archív)
  useEffect(() => {
    async function load() {
      try {
        let url = "/api/hirado/today";

        if (videoId) {
          url = `/api/hirado/by-id?videoId=${videoId}`;
        }

        const res = await fetch(url, {
          cache: "no-store",
          credentials: "include",
        });

        const text = await res.text();
        if (!text) {
          console.warn("⚠️ /api/hirado üres választ adott");
          return;
        }

        const json = JSON.parse(text);
        setData(json);
      } catch (err) {
        console.error("⚠️ Híradó adat hiba:", err);
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
          console.warn("⚠️ /api/auth/me üres választ adott");
          setUser(null);
          return;
        }

        let json;
        try {
          json = JSON.parse(text);
        } catch {
          console.warn("⚠️ /api/auth/me nem JSON választ adott:", text);
          setUser(null);
          return;
        }

        setUser(json.user ?? null);
      } catch (err) {
        console.error("⚠️ Felhasználó lekérési hiba:", err);
        setUser(null);
      }
    }

    loadUser();
  }, []);

  if (!data || !user) {
    return <div className="p-6">Betöltés...</div>;
  }

  // 🔥 A teljes híradó oldal a 2026-os layoutot használja
  return <HiradoLayout2026 video={data.video} user={user} />;
}
