"use client";

import { useEffect, useState } from "react";
import HiradoLayout2026 from "@/components/HiradoLayout2026";
import { useUserStore } from "@/store/useUserStore";

export default function HiradoClient({
  videoId,
  videoUrl,
}: {
  videoId: number;
  videoUrl: string;
}) {
  const [data, setData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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
    let cancelled = false;
    async function load() {
      try {
        let url = "/api/hirado/today";
        if (videoId) url = `/api/hirado/by-id?videoId=${videoId}`;

        const res = await fetch(url, {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) throw new Error(`hirado_http_${res.status}`);

        const text = await res.text();
        if (!text) throw new Error("hirado_empty_response");

        const json = JSON.parse(text);
        if (json?.hasVideo === false) {
          if (cancelled) return;
          setData(json);
          setLoadError(null);
          return;
        }
        if (!json?.video || typeof json.video !== "object" || !json.video.id) {
          throw new Error("hirado_invalid_response");
        }

        // 🔥 A videó URL-t NEM innen vesszük többé
        // A signed URL-t a szerver oldalon generáljuk
        if (cancelled) return;
        setData(json);
        setLoadError(null);
      } catch (err) {
        console.error("Híradó adat hiba:", err);
        if (cancelled) return;
        setData(null);
        setLoadError("A híradó adatai nem tölthetők be.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  // 🔥 Felhasználó lekérése
  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) throw new Error(`auth_http_${res.status}`);

        const text = await res.text();
        if (!text) {
          if (cancelled) return;
          setUser(null);
          setUserLoaded(true);
          return;
        }

        let json;
        try {
          json = JSON.parse(text);
        } catch {
          if (cancelled) return;
          setUser(null);
          // A successful HTTP response with malformed JSON is still a
          // completed auth check. Leaving this false keeps the page in the
          // loading state forever for anonymous users.
          setUserLoaded(true);
          return;
        }

        if (cancelled) return;
        setUser(json.user ?? null);
        setUserLoaded(true);
      } catch (err) {
        console.error("Felhasználó lekérési hiba:", err);
        if (cancelled) return;
        setUser(null);
        setUserLoaded(true);
      }
    }

    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return <div className="p-6 text-danger">{loadError}</div>;
  }

  if (data?.hasVideo === false) {
    return <div className="p-6">Ma még nincs elérhető híradó.</div>;
  }

  if (!data || !userLoaded) {
    return <div className="p-6">Betöltés...</div>;
  }

  if (!user) {
    return <div className="p-6 text-center">A híradó megtekintéséhez be kell jelentkezni.</div>;
  }

  // 🔥 A HiradoLayout2026 mostantól megkapja a signed videoUrl-t
  return <HiradoLayout2026 video={data.video} user={user} videoUrl={videoUrl} />;
}
