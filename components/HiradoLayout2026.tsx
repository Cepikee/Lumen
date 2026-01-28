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

  // 🔥 NÉZETVÁLTÓ
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
            <div style={{ marginTop: "2rem" }}>
              {/* 🔥 ARCHÍVUM CÍM + NÉZETVÁLTÓ EGY SORBAN */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <h2 style={{ margin: 0 }}>Archívum</h2>

                <div style={{ display: "flex", gap: "0.5rem" }}>
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
                    Slider
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
                    Lista
                  </button>
                </div>
              </div>

              {/* 🔥 NÉZETEK */}
              <div>
                {view === "slider" && <HiradoArchiveSlider />}

                {view === "list" && (
                  <div>
                    {/* 🔥 LISTA NÉZET FEJLÉC – 1 SORBAN */}
                    <div
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 600,
                        marginBottom: "1rem",
                      }}
                    >
                      Utom Híradó: {today}
                    </div>

                    <HiradoArchive />
                  </div>
                )}
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
