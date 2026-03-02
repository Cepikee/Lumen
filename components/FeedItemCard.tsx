"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { EB_Garamond } from "next/font/google";

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export interface FeedItem {
  id: number;
  url: string;
  source_id: number;
  content: string;
  title: string;
  detailed_content: string;
  ai_clean: number;
  created_at: string;
  category?: string;
}

const baseTextStyle: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: 1.7,
  color: "var(--feed-text)",
  letterSpacing: "0.2px",
  fontWeight: 400,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.05rem",
  lineHeight: 1.3,
  fontWeight: 600,
  color: "var(--feed-text)",
};

const detailedStyle: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.75,
  color: "var(--feed-text)",
  letterSpacing: "0.2px",
};

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "néhány másodperce érkezett";
  if (diffMin < 60) return `${diffMin} perce érkezett`;
  if (diffHour < 24) return `${diffHour} órája érkezett`;
  return `${diffDay} napja érkezett`;
}

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

export default function FeedItemCard({
  item,
  expanded,
  onToggle,
  viewMode,
}: {
  item: FeedItem;
  expanded: boolean;
  onToggle: () => void;
  viewMode: "card" | "compact";
}) {
  const url = item.url || "";
  const source = {
    1: "telex",
    2: "24hu",
    3: "index",
    4: "hvg",
    5: "portfolio",
    6: "444",
    7: "origo",
  }[item.source_id] || "ismeretlen";
  const sourceClass = `source-${source}`;

  // Compact view
  if (viewMode === "compact") {
    return (
      <div className={`feed-wrapper compact ${ebGaramond.className}`} style={baseTextStyle}>
        <div
          className="feed-card compact mb-2 p-2 rounded theme-card"
          data-source-text={source.toUpperCase()}
          onClick={() => { window.location.href = `/cikk/${item.id}`; }}
          style={{ backgroundColor: "var(--bs-body-bg)" }}
        >
          <div className="d-flex justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <span className={`badge ${sourceClass}`} style={{ fontSize: "0.65rem", fontWeight: "bold" }}>
                {source.toUpperCase()}
              </span>

              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-decoration-none title-compact"
                onClick={(e) => e.stopPropagation()}
                style={titleStyle}
              >
                {item.title}
              </a>
            </div>

            {item.ai_clean === 1 && (
              <span
                className={`badge ${sourceClass}`}
                style={{ fontSize: "0.65rem", fontWeight: "bold" }}
                title="Ez a tartalom teljes egészében AI által lett megfogalmazva."
              >
                🤖 AI
              </span>
            )}
          </div>

          <div className={`mt-1 ${expanded ? "" : "clamp-2"} content-compact`} style={{ ...baseTextStyle }}>
            <ReactMarkdown>{item.content}</ReactMarkdown>
          </div>

          <button
            className="btn btn-link p-0 mt-1 compact-toggle"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
            style={{ fontSize: "0.9rem" }}
          >
            {expanded ? "🔽 Bezárás" : "📘 Részletek"}
          </button>

          {expanded && (
            <div className="mt-2 p-2 rounded theme-card-inner" style={{ backgroundColor: "var(--bs-body-bg)" }}>
              <div style={detailedStyle}>
                <ReactMarkdown>{item.detailed_content}</ReactMarkdown>
              </div>
            </div>
          )}

          <div className="d-flex justify-content-between align-items-center mt-2">
            <p className="text-muted small mb-0 time-compact" title={formatFullDate(item.created_at)} style={{ fontSize: "0.85rem", color: "var(--article-muted)" }}>
              {formatRelativeTime(item.created_at)}
            </p>

            {item.category && (
              <span className="category-compact" style={{ fontSize: "0.75rem", opacity: 0.9 }}>{item.category}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Card view
  return (
    <div className={`feed-wrapper ${ebGaramond.className}`} style={baseTextStyle}>
      <div
        className="feed-card mb-3 p-3 rounded shadow-sm theme-card"
        data-source-text={source.toUpperCase()}
        onClick={() => { window.location.href = `/cikk/${item.id}`; }}
        style={{ backgroundColor: "var(--bs-body-bg)" }}
      >
        <div className="card-body position-relative" style={{ zIndex: 2 }}>
          <h5 className="card-title d-flex justify-content-between align-items-center" style={{ margin: 0 }}>
            <div className="d-flex align-items-center gap-2">
              <span className={`badge me-2 ${sourceClass}`} style={{ fontWeight: "bold", fontSize: "0.75rem" }}>
                {source.toUpperCase()}
              </span>

              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-decoration-none title-card"
                onClick={(e) => e.stopPropagation()}
                style={titleStyle}
              >
                {item.title}
              </a>
            </div>

            {item.ai_clean === 1 && (
              <span className={`badge ${sourceClass}`} style={{ fontWeight: "bold" }} title="Ez a tartalom teljes egészében AI által lett megfogalmazva.">
                AI‑fogalmazás
              </span>
            )}
          </h5>

          <div className="mt-2 content-card" style={{ ...baseTextStyle }}>
            <ReactMarkdown>{item.content}</ReactMarkdown>
          </div>

          <button
            className="btn btn-link p-0 mt-2 card-toggle"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
            style={{ fontSize: "0.95rem" }}
          >
            {expanded ? "🔽 Bezárás" : "📘 Részletes elemzésért kattints ide!"}
          </button>

          {expanded && (
            <div className="mt-3 p-3 rounded theme-card-inner" style={{ backgroundColor: "var(--bs-body-bg)" }}>
              <div style={detailedStyle}>
                {item.detailed_content ? (
                  <ReactMarkdown>{item.detailed_content}</ReactMarkdown>
                ) : (
                  <p className="text-warning small mb-0">Ehhez a hírhez nincs elmentve részletes elemzés.</p>
                )}
              </div>
            </div>
          )}

          <div className="d-flex justify-content-between align-items-center mt-3">
            <p className="text-muted small mb-0 time-card" title={formatFullDate(item.created_at)} style={{ fontSize: "0.9rem", color: "var(--article-muted)" }}>
              {formatRelativeTime(item.created_at)}
            </p>

            {item.category && (
              <span className="category-card" style={{ fontSize: "0.85rem", opacity: 0.9 }}>{item.category}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
