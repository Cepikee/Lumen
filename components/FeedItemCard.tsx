"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";

export interface FeedItem {
  id: number;
  url: string;
  source_id: number;
  content: string;
  title: string;
  detailed_content: string;
  ai_clean: number;
  created_at: string;
  category?: string; // ← KATEGÓRIA HOZZÁADVA
}

// --- FORRÁS MAPPING --- //
const SOURCE_MAP: Record<number, string> = {
  1: "telex",
  2: "24hu",
  3: "index",
  4: "hvg",
  5: "portfolio",
  6: "444",
};

// --- DÁTUM FORMÁZÓK --- //
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
  const source = SOURCE_MAP[item.source_id] || "ismeretlen";
  const sourceClass = `source-${source}`;

  // --- COMPACT NÉZET --- //
  if (viewMode === "compact") {
    return (
      <div className="feed-wrapper compact">
        <div
          className="feed-card compact mb-2 p-2 rounded"
          data-source-text={source.toUpperCase()}
          style={{ backgroundColor: "#1a1a1a", color: "white", cursor: "pointer" }}
          onClick={() => {
            window.location.href = `/cikk/${item.id}`;
          }}
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
                className="text-decoration-none"
                onClick={(e) => e.stopPropagation()}
                style={{
                  fontWeight: "bold",
                  fontSize: "0.85rem",
                  lineHeight: "1.2",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
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

          <div
            className={`mt-1 ${expanded ? "" : "clamp-2"}`}
            style={{
              fontSize: "0.85rem",
              lineHeight: "1.2",
              ...(expanded ? {} : { maxHeight: "3.6em", overflow: "hidden" }),
            }}
          >
            <ReactMarkdown>{item.content}</ReactMarkdown>
          </div>

          <button
            className="btn btn-link p-0 mt-1"
            style={{ fontSize: "0.8rem" }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggle();
            }}
          >
            {expanded ? "🔽 Bezárás" : "📘 Részletek"}
          </button>

          {expanded && (
            <div className="mt-2 p-2 rounded" style={{ backgroundColor: "#2a2a2a" }}>
              <ReactMarkdown>{item.detailed_content}</ReactMarkdown>
            </div>
          )}

          {/* --- IDŐ + KATEGÓRIA EGY SORBAN --- */}
          <div className="d-flex justify-content-between align-items-center mt-2">
            <p
              className="text-muted small mb-0"
              style={{ fontSize: "0.7rem" }}
              title={formatFullDate(item.created_at)}
            >
              {formatRelativeTime(item.created_at)}
            </p>

            {item.category && (
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "white",
                  opacity: 0.8,
                  textTransform: "uppercase",
                }}
              >
                {item.category}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- CARD NÉZET --- //
  return (
    <div className="feed-wrapper">
      <div
        className="feed-card mb-3 p-3 rounded shadow-sm"
        style={{ backgroundColor: "#1a1a1a", cursor: "pointer" }}
        data-source-text={source.toUpperCase()}
        onClick={() => {
          window.location.href = `/cikk/${item.id}`;
        }}
      >
        <div className="card-body position-relative" style={{ zIndex: 2 }}>
          <h5 className="card-title d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <span className={`badge me-2 ${sourceClass}`} style={{ fontWeight: "bold", fontSize: "0.75rem" }}>
                {source.toUpperCase()}
              </span>

              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-decoration-none"
                onClick={(e) => e.stopPropagation()}
                style={{
                  fontWeight: "bold",
                  fontSize: "1.15rem",
                  lineHeight: "1.3",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.title}
              </a>
            </div>

            {item.ai_clean === 1 && (
              <span
                className={`badge ${sourceClass}`}
                style={{ fontWeight: "bold" }}
                title="Ez a tartalom teljes egészében AI által lett megfogalmazva."
              >
                AI‑fogalmazás
              </span>
            )}
          </h5>

          <div className="mt-2">
            <ReactMarkdown>{item.content}</ReactMarkdown>
          </div>

          <button
            className="btn btn-link p-0 mt-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggle();
            }}
          >
            {expanded ? "🔽 Bezárás" : "📘 Részletes elemzésért kattints ide!"}
          </button>

          {expanded && (
            <div className="mt-3 p-3 rounded" style={{ backgroundColor: "#2a2a2a" }}>
              {item.detailed_content ? (
                <ReactMarkdown>{item.detailed_content}</ReactMarkdown>
              ) : (
                <p className="text-warning small mb-0">Ehhez a hírhez nincs elmentve részletes elemzés.</p>
              )}
            </div>
          )}

          {/* --- IDŐ + KATEGÓRIA EGY SORBAN --- */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <p
              className="text-muted small mb-0"
              title={formatFullDate(item.created_at)}
              style={{ fontSize: "0.75rem" }}
            >
              {formatRelativeTime(item.created_at)}
            </p>

            {item.category && (
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "white",
                  opacity: 0.8,
                  textTransform: "uppercase",
                }}
              >
                {item.category}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
