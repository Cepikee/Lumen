"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import HiradoPlayerWrapper from "@/app/hirado/HiradoPlayerWrapper";
import HiradoArchiveSlider from "@/components/HiradoArchiveSlider";
import HiradoArchive from "@/components/HiradoArchive";
import Felolvasas from "@/components/Felolvasas";

type HiradoLayoutProps = {
  video?: {
    id: number;
    title?: string;
    date?: string;
    created_at?: string;
    video_date?: string;
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

  const [view, setView] = useState<"slider" | "list">("slider");

  const sliderRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerMinHeight, setContainerMinHeight] = useState<number | undefined>(undefined);
  const [measuring, setMeasuring] = useState(true);

  const safeVideo = video ?? { id: 0 };

  useLayoutEffect(() => {
    const id = window.setTimeout(() => {
      const sliderH = sliderRef.current?.offsetHeight ?? 0;
      const listH = listRef.current?.offsetHeight ?? 0;
      const maxH = Math.max(sliderH, listH, 0);

      setContainerMinHeight(maxH > 0 ? maxH : 260);
      setMeasuring(false);
    }, 50);

    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const onResize = () => {
      setMeasuring(true);
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <h2 style={{ margin: 0 }}>Archívum</h2>
                <Felolvasas />
              </div>

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

            <div
              ref={containerRef}
              style={{
                position: "relative",
                minHeight: containerMinHeight ? `${containerMinHeight}px` : undefined,
              }}
            >
              <div
                ref={sliderRef}
                style={{
                  display: measuring ? "block" : view === "slider" ? "block" : "none",
                  visibility: measuring ? "hidden" : "visible",
                }}
              >
                <HiradoArchiveSlider />
              </div>

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
