"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/store/useUserStore";
import HiradoPlayerWrapper from "@/app/hirado/HiradoPlayerWrapper";
import HiradoArchiveSlider from "@/components/HiradoArchiveSlider";
import HiradoArchive from "@/components/HiradoArchive"; // 🔥 LISTA NÉZET

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

  // 🔥 NÉZETVÁLTÓ ÁLLAPOT
  const [view, setView] = useState<"slider" | "list">("slider");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) =>
      setSystemTheme(e.matches ? "dark" : "light");

    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);

  const activeTheme = theme === "system" ? systemTheme : theme;

  const safeVideo = video ?? { id: 0 };

  return (
    <div>
      <header>
        <div>Utom Híradó</div>
        <div>{today}</div>
      </header>

      <main>
        <div>
          <div>
            <div>
              <HiradoPlayerWrapper
                video={safeVideo}
                isPremium={user.isPremium}
                videoUrl={videoUrl}
              />
            </div>
          </div>

          <footer>
            <div>
              <h2>Archívum</h2>

              {/* 🔥 NÉZETVÁLTÓ GOMBOK */}
              <div style={{ display: "flex", gap: "1rem", margin: "1rem 0" }}>
                <button
                  onClick={() => setView("slider")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: view === "slider" ? "#00d4ff" : "#ddd",
                    color: view === "slider" ? "#000" : "#333",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Slider nézet
                </button>

                <button
                  onClick={() => setView("list")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: view === "list" ? "#00d4ff" : "#ddd",
                    color: view === "list" ? "#000" : "#333",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Lista nézet
                </button>
              </div>

              {/* 🔥 NÉZETEK */}
              <div>
                {view === "slider" && <HiradoArchiveSlider />}
                {view === "list" && <HiradoArchive />}
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
