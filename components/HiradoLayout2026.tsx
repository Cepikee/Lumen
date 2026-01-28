"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useUserStore } from "@/store/useUserStore";
import HiradoPlayerWrapper from "@/app/hirado/HiradoPlayerWrapper";
import HiradoArchiveSlider from "@/components/HiradoArchiveSlider";
import HiradoArchive from "@/components/HiradoArchive";

type HiradoLayoutProps = {
  video?: {
    id: number;
    title?: string;
    date?: string;
    thumbnailUrl?: string;
  };
  user: { isPremium: boolean };
  videoUrl: string;
};

export default function HiradoLayout2026({
  video,
  user,
  videoUrl,
}: HiradoLayoutProps) {
  const today = new Date().toLocaleDateString("hu-HU");
  const theme = useUserStore((s) => s.theme);

  const [systemTheme, setSystemTheme] = useState<"dark" | "light">(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  );

  // Nézetváltó: "slider" vagy "list"
  const [view, setView] = useState<"slider" | "list">("slider");

  // Méréshez és a konténer magasságának rögzítéséhez
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerMinHeight, setContainerMinHeight] = useState<number | undefined>(undefined);

  // Amíg mérünk, mindkét nézet látható, de rejtett (visibility:hidden) hogy ne villanjon
  const [measuring, setMeasuring] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) =>
      setSystemTheme(e.matches ? "dark" : "light");

    mq.addEventListener?.("change", handler);
    mq.addListener?.(handler);

    return () => {
      mq.removeEventListener?.("change", handler);
      mq.removeListener?.(handler);
    };
  }, []);

  // Mérjük meg a két nézet magasságát, és állítsuk be a konténer minHeight-ját.
  // Ezzel elkerüljük, hogy a layout magassága váltáskor változzon -> nincs ugrás.
  useLayoutEffect(() => {
    // Kicsit késleltetünk, hogy minden komponens rendereljen (slider képek, stb.)
    const id = window.setTimeout(() => {
      const sliderH = sliderRef.current?.offsetHeight ?? 0;
      const listH = listRef.current?.offsetHeight ?? 0;
      const maxH = Math.max(sliderH, listH, 0);

      if (maxH > 0) {
        setContainerMinHeight(maxH);
      } else {
        // fallback: ha nem sikerült mérni, állítsunk egy konzerv értéket
        setContainerMinHeight(260);
      }

      // mérés kész
      setMeasuring(false);
    }, 50);

    return () => window.clearTimeout(id);
  }, []);

  // Újramérés ablakméret-változáskor (responsive)
  useEffect(() => {
    const onResize = () => {
      // újramérés: ideiglenesen engedélyezzük mindkét nézetet, mérünk, majd visszaállítjuk
      setMeasuring(true);
      // kis késleltetés, hogy a DOM stabil legyen
      setTimeout(() => {
        const sliderH = sliderRef.current?.offsetHeight ?? 0;
        const listH = listRef.current?.offsetHeight ?? 0;
        const maxH = Math.max(sliderH, listH, 0);
        if (maxH > 0) setContainerMinHeight(maxH);
        setMeasuring(false);
      }, 80);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const safeVideo = video ?? { id: 0 };

  return (
    <div>
      <header>
        <div>Utom Híradó</div>
        <div>{today}</div>
      </header>

      <main>
        <HiradoPlayerWrapper
          video={safeVideo}
          isPremium={user.isPremium}
          videoUrl={videoUrl}
        />

        <footer>
          <div style={{ marginTop: "2rem" }}>
            {/* ARCHÍVUM + pill váltó */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h2 style={{ margin: 0 }}>Archívum</h2>

              <div
                style={{
                  display: "flex",
                  borderRadius: 999,
                  overflow: "hidden",
                  border: "1px solid #ccc",
                }}
              >
                <button
                  onClick={() => setView("slider")}
                  style={{
                    padding: "6px 14px",
                    border: "none",
                    cursor: "pointer",
                    background: view === "slider" ? "#00d4ff" : "transparent",
                    color: view === "slider" ? "#000" : "#333",
                    fontWeight: 600,
                  }}
                >
                  Slider
                </button>

                <button
                  onClick={() => setView("list")}
                  style={{
                    padding: "6px 14px",
                    border: "none",
                    cursor: "pointer",
                    background: view === "list" ? "#00d4ff" : "transparent",
                    color: view === "list" ? "#000" : "#333",
                    fontWeight: 600,
                  }}
                >
                  Lista
                </button>
              </div>
            </div>

            {/* KONTAINER: rögzített minHeight a mért max alapján -> nem ugrik */}
            <div
              ref={containerRef}
              style={{
                position: "relative",
                // ha van mért magasság, használjuk; különben hagyjuk, hogy a tartalom adja
                minHeight: containerMinHeight ? `${containerMinHeight}px` : undefined,
              }}
            >
              {/* SLIDER wrapper */}
              <div
                ref={sliderRef}
                // mérés alatt mindkét nézet látható, de rejtett, hogy ne villanjon
                style={{
                  display: measuring ? "block" : view === "slider" ? "block" : "none",
                  visibility: measuring ? "hidden" : "visible",
                }}
              >
                <HiradoArchiveSlider />
              </div>

              {/* LIST wrapper */}
              <div
                ref={listRef}
                style={{
                  display: measuring ? "block" : view === "list" ? "block" : "none",
                  visibility: measuring ? "hidden" : "visible",
                }}
              >
                <HiradoArchive />
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
