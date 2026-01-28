"use client";

import { useEffect, useState } from "react";
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

export default function HiradoLayout2026({ video, user, videoUrl }: HiradoLayoutProps) {
  const today = new Date().toLocaleDateString("hu-HU");
  const theme = useUserStore((s) => s.theme);

  const [systemTheme, setSystemTheme] = useState<"dark" | "light">(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  );

  // Nézetváltó
  const [view, setView] = useState<"slider" | "list">("slider");

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

            {/* NÉZETEK — NINCS ANIMÁCIÓ, NINCS TRANSLATE, NINCS UGRÁS */}
            <div>
              <div style={{ display: view === "slider" ? "block" : "none" }}>
                <HiradoArchiveSlider />
              </div>

              <div style={{ display: view === "list" ? "block" : "none" }}>
                <HiradoArchive />
              </div>
            </div>

          </div>
        </footer>
      </main>
    </div>
  );
}
