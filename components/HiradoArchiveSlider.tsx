"use client";

import { useEffect, useState, useRef } from "react";

type VideoItem = {
  id: number;
  title?: string;
  date: string;
  thumbnailUrl?: string;
};

const ARCHIVE_PLACEHOLDER = "/icons/kep-placeholder.png";

function safeThumbnailUrl(value: unknown): string {
  if (typeof value !== "string") return ARCHIVE_PLACEHOLDER;
  const trimmed = value.trim();
  if (!trimmed) return ARCHIVE_PLACEHOLDER;
  if (trimmed.startsWith("/") || /^https?:\/\//i.test(trimmed)) return trimmed;
  return ARCHIVE_PLACEHOLDER;
}

export default function HiradoArchiveSlider() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const res = await fetch("/api/hirado/archive", {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`archive_${res.status}`);
        const json = await res.json();
        const videos = Array.isArray(json?.videos) ? json.videos : [];
        setVideos(videos.filter((video: any) => {
          const id = Number(video?.id);
          return Number.isSafeInteger(id) && id > 0 &&
            typeof video?.date === "string" && !Number.isNaN(Date.parse(video.date));
        }));
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") setVideos([]);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!videos.length || !scrollRef.current) return;

    const sorted = [...videos].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const featured = sorted[0];
    const index = sorted.findIndex((v) => v.id === featured.id);

    const cardWidth = 148;
    scrollRef.current.scrollTo({
      left: index * cardWidth - window.innerWidth / 2 + cardWidth / 2,
      behavior: "smooth",
    });
  }, [videos]);

  if (!videos.length) {
    return (
      <div style={{ opacity: 0.6, fontSize: 13 }}>Nincs archív híradó.</div>
    );
  }

  // The archive labels are shown in Budapest local time. Using UTC here made
  // a video around local midnight appear as "MA" on the wrong calendar day.
  const dateKey = (value: Date) =>
    value.toLocaleDateString("sv-SE", { timeZone: "Europe/Budapest" });
  const todayIso = dateKey(new Date());

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <button
        onClick={() =>
          scrollRef.current?.scrollBy({ left: -180, behavior: "smooth" })
        }
        aria-label="Előző"
        style={{
          position: "absolute",
          top: "50%",
          left: 6,
          transform: "translateY(-50%)",
          background: "rgba(0,0,0,0.28)",
          border: "none",
          color: "#fff",
          padding: "8px",
          borderRadius: 999,
          cursor: "pointer",
          zIndex: 10,
        }}
      >
        ◀
      </button>

      <div
        ref={scrollRef}
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          padding: "6px 6px",
          WebkitOverflowScrolling: "touch",
          justifyContent: "center",
        }}
      >
        {videos.map((v) => {
          const videoDate = new Date(v.date);
          const isoDate = dateKey(videoDate);
          const formatted = videoDate.toLocaleDateString("hu-HU", {
            timeZone: "Europe/Budapest",
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
                minWidth: 140,
                padding: 8,
                borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                flexShrink: 0,
                textDecoration: "none",
                color: "inherit",
                transition: "transform 120ms ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.02)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "none")
              }
            >
              <img
                src={safeThumbnailUrl(v.thumbnailUrl)}
                alt="Borítókép"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = ARCHIVE_PLACEHOLDER;
                }}
                style={{
                  width: "100%",
                  height: 80,
                  borderRadius: 6,
                  marginBottom: 8,
                  objectFit: "cover",
                  boxShadow: "0 0 6px rgba(0,0,0,0.2)",
                }}
              />

              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
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
        style={{
          position: "absolute",
          top: "50%",
          right: 6,
          transform: "translateY(-50%)",
          background: "rgba(0,0,0,0.28)",
          border: "none",
          color: "#fff",
          padding: "8px",
          borderRadius: 999,
          cursor: "pointer",
          zIndex: 10,
        }}
      >
        ▶
      </button>
    </div>
  );
}
