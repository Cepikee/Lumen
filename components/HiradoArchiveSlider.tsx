"use client";

import { useEffect, useState, useRef } from "react";

type VideoItem = { id: number; title?: string; date: string; file_url?: string };

export default function HiradoArchiveSlider() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/hirado/archive", { cache: "no-store", credentials: "include" });
        const json = await res.json();
        setVideos(json.videos || []);
      } catch {
        setVideos([]);
      }
    }
    load();
  }, []);

  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -180, behavior: "smooth" });
  const scrollRight = () => scrollRef.current?.scrollBy({ left: 180, behavior: "smooth" });

  const wrapperStyle: React.CSSProperties = { position: "relative", width: "100%" };
  const sliderStyle: React.CSSProperties = {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    padding: "6px 6px",
    WebkitOverflowScrolling: "touch",
    justifyContent: "center"
  };
  const arrowStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(0,0,0,0.28)",
    border: "none",
    color: "#fff",
    padding: "8px",
    borderRadius: 999,
    cursor: "pointer",
  };

  const cardStyleBase: React.CSSProperties = {
    minWidth: 140,
    padding: 8,
    borderRadius: 8,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.05)",
    flexShrink: 0,
  };

  if (!videos.length) {
    return <div style={{ opacity: 0.6, fontSize: 13 }}>Nincs archív híradó.</div>;
  }

  const todayIso = new Date().toISOString().split("T")[0];

  return (
    <div style={wrapperStyle}>
      <button onClick={scrollLeft} aria-label="Előző" style={{ ...arrowStyle, left: 6 }}>
        ◀
      </button>

      <div ref={scrollRef} style={sliderStyle}>
        {videos.map((v) => {
          const isoDate = (v.date || "").split("T")[0] || v.date;
          const formatted = new Date(v.date).toLocaleDateString("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit" });
          const isToday = isoDate === todayIso;

          return (
            <a
              key={v.id}
              href={`/hirado?video=${v.id}`}
              style={{
                ...cardStyleBase,
                transition: "transform 120ms ease, background 120ms ease",
                textDecoration: "none",
                color: "inherit",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
            >
              <div style={{ width: "100%", height: 56, background: "#1f2937", borderRadius: 6, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
                kép
              </div>

              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Utom Híradó</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{formatted}</div>

              {isToday && <div style={{ marginTop: 8, display: "inline-block", padding: "4px 8px", borderRadius: 999, background: "#00d4ff", color: "#000", fontSize: 12 }}>MA</div>}
            </a>
          );
        })}
      </div>

      <button onClick={scrollRight} aria-label="Következő" style={{ ...arrowStyle, right: 6 }}>
        ▶
      </button>
    </div>
  );
}
