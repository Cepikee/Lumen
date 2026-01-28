"use client";

import { useEffect, useState, useRef } from "react";

type VideoItem = {
  id: number;
  title?: string;
  date: string;
  thumbnailUrl?: string;
};

export default function HiradoArchiveSlider() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // -------------------------------------------------------
  // 1) ARCHÍV BETÖLTÉSE
  // -------------------------------------------------------
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/hirado/archive", {
          cache: "no-store",
          credentials: "include",
        });
        const json = await res.json();
        setVideos(json.videos || []);
      } catch {
        setVideos([]);
      }
    }
    load();
  }, []);

  // -------------------------------------------------------
  // 2) AUTOMATIKUS KÖZÉPRE GÖRGETÉS A LEGFRISSEBBRE
  // -------------------------------------------------------
  useEffect(() => {
    if (!videos.length || !scrollRef.current) return;

    // Rendezés dátum szerint (legfrissebb elöl)
    const sorted = [...videos].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Featured kiválasztása
    const todayIso = new Date().toISOString().split("T")[0];
    const featured =
      sorted.find((v) => (v.date || "").startsWith(todayIso)) || sorted[0];

    // Featured index
    const index = sorted.findIndex((v) => v.id === featured.id);

    // Automatikus középre görgetés
    const cardWidth = 148; // 140 + padding
    scrollRef.current.scrollTo({
      left: index * cardWidth - window.innerWidth / 2 + cardWidth / 2,
      behavior: "smooth",
    });
  }, [videos]);

  // -------------------------------------------------------
  // 3) STÍLUSOK
  // -------------------------------------------------------
  const wrapperStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
  };

  const sliderStyle: React.CSSProperties = {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    padding: "6px 6px",
    WebkitOverflowScrolling: "touch",
    justifyContent: "center",
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
    zIndex: 10,
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
    return (
      <div style={{ opacity: 0.6, fontSize: 13 }}>Nincs archív híradó.</div>
    );
  }

  const todayIso = new Date().toISOString().split("T")[0];

  // -------------------------------------------------------
  // 4) RENDER
  // -------------------------------------------------------
  return (
    <div style={wrapperStyle}>
      <button
        onClick={() =>
          scrollRef.current?.scrollBy({ left: -180, behavior: "smooth" })
        }
        aria-label="Előző"
        style={{ ...arrowStyle, left: 6 }}
      >
        ◀
      </button>

      <div ref={scrollRef} style={sliderStyle}>
        {videos.map((v) => {
          const isoDate = (v.date || "").split("T")[0] || v.date;
          const formatted = new Date(v.date).toLocaleDateString("hu-HU", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
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
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.02)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "none")
              }
            >
              <img
                src={v.thumbnailUrl ?? "/icons/kep-placeholder.png"}
                alt="Borítókép"
                style={{
                  width: "100%",
                  height: 80,
                  borderRadius: 6,
                  marginBottom: 8,
                  objectFit: "cover",
                  boxShadow: "0 0 6px rgba(0,0,0,0.2)",
                }}
              />

              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Utom Híradó
              </div>

              <div style={{ fontSize: 12, opacity: 0.85 }}>{formatted}</div>

              {isToday && (
                <div
                  style={{
                    marginTop: 8,
                    display: "inline-block",
                    padding: "4px 8px",
                    borderRadius: 999,
                    background: "#00d4ff",
                    color: "#000",
                    fontSize: 12,
                  }}
                >
                  MA
                </div>
              )}
            </a>
          );
        })}
      </div>

      <button
        onClick={() =>
          scrollRef.current?.scrollBy({ left: 180, behavior: "smooth" })
        }
        aria-label="Következő"
        style={{ ...arrowStyle, right: 6 }}
      >
        ▶
      </button>
    </div>
  );
}
