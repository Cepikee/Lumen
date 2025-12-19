"use client";

import ReactMarkdown from "react-markdown";

interface FeedItem {
  id: number;
  url: string;
  source: string;
  content: string;
  detailed_content: string;
  ai_clean: number;
  created_at: string;
}

export default function FeedItemCard({
  item,
  expanded,
  onToggle,
}: {
  item: FeedItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const url = item.url || "";
  const source = item.source?.toLowerCase() || "ismeretlen";

  const sourceColors: Record<string, string> = {
    telex: "#00AEEF",
    hvg: "#FFCC00",
    index: "#009933",
    "444": "#000000",
    "24": "#FF3300",
    portfolio: "#FF6600",
    ismeretlen: "#888888",
  };

  const accent = sourceColors[source] ?? "#888888";

  // RGB konverzió a CSS-hez
  const accentRgb =
    accent
      .replace("#", "")
      .match(/.{1,2}/g)
      ?.map((x) => parseInt(x, 16))
      .join(",") ?? "255,255,255";

  return (
    <div
      className="card feed-card mb-3 shadow"
      data-source-text={source.toUpperCase()}
      style={
        {
          backgroundColor: "#1e1e1e",
          color: "white",
          borderLeft: `6px solid ${accent}`,
          "--accent-color": accent,
          "--accent-rgb": accentRgb,
        } as React.CSSProperties
      }
    >
      <div className="card-body position-relative" style={{ zIndex: 2 }}>
        <h5 className="card-title d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <span
              className="badge me-2"
              style={{
                backgroundColor: accent,
                color: "black",
                fontWeight: "bold",
                fontSize: "0.75rem",
              }}
            >
              {source.toUpperCase()}
            </span>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-decoration-none"
              style={{ color: accent, fontWeight: "bold" }}
            >
              {url}
            </a>
          </div>

          {Number(item.ai_clean) === 1 && (
            <span
              className="badge"
              style={{
                backgroundColor: accent,
                color: "black",
                fontWeight: "bold",
              }}
            >
              100% AI‑fogalmazás
            </span>
          )}
        </h5>

        <div className="mt-2">
          <ReactMarkdown>{item.content ?? ""}</ReactMarkdown>
        </div>

        <button
          className="btn btn-link p-0 mt-2"
          style={{ color: accent }}
          onClick={onToggle}
        >
          {expanded ? "🔽 Bezárás" : "📘 Részletes elemzésért kattints ide!"}
        </button>

        {expanded && (
          <div
            className="mt-3 p-3 rounded"
            style={{ backgroundColor: "#2a2a2a" }}
          >
            {item.detailed_content ? (
              <ReactMarkdown>{item.detailed_content}</ReactMarkdown>
            ) : (
              <p className="text-warning small mb-0">
                Ehhez a hírhez nincs elmentve részletes elemzés.
              </p>
            )}
          </div>
        )}

        <p className="text-muted small mt-3 mb-0">
          {item.created_at
            ? new Date(item.created_at).toLocaleString("hu-HU")
            : ""}
        </p>
      </div>
    </div>
  );
}
