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

// --- DÁTUM FORMÁZÓK --- //
function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "néhány másodperce érkezett";
  if (diffMin < 60) return `${diffMin} perce érkezett`;
  if (diffHour < 24) return `${diffHour} órája érkezett`;
  return `${diffDay} napja érkezett`;
}

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  };
  return date.toLocaleString("hu-HU", options);
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

  const accentRgb =
    accent
      .replace("#", "")
      .match(/.{1,2}/g)
      ?.map((x) => parseInt(x, 16))
      .join(",") ?? "255,255,255";

  // --- COMPACT NÉZET --- //
  if (viewMode === "compact") {
    return (
      <div className={`feed-wrapper compact`}>
        <div
          className="feed-card compact mb-2 p-2 rounded"
          style={{
            backgroundColor: "#1a1a1a",
            borderLeft: `4px solid ${accent}`,
            color: "white",
          }}
        >
          <div className="d-flex justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <span
                className="badge"
                style={{
                  backgroundColor: accent,
                  color: "black",
                  fontSize: "0.65rem",
                  fontWeight: "bold",
                }}
              >
                {source.toUpperCase()}
              </span>

              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-decoration-none"
                style={{
                  color: accent,
                  fontWeight: "bold",
                  fontSize: "0.85rem",
                }}
              >
                {url}
              </a>
            </div>

            {item.ai_clean === 1 && (
              <span
                className="badge"
                style={{
                  backgroundColor: accent,
                  color: "black",
                  fontSize: "0.65rem",
                  fontWeight: "bold",
                }}
              >
                AI
              </span>
            )}
          </div>

          <div
            className="mt-1"
            style={{
              fontSize: "0.85rem",
              lineHeight: "1.2",
              maxHeight: "3.6em",
              overflow: "hidden",
            }}
          >
            <ReactMarkdown>{item.content}</ReactMarkdown>
          </div>

          <button
            className="btn btn-link p-0 mt-1"
            style={{ color: accent, fontSize: "0.8rem" }}
            onClick={onToggle}
          >
            {expanded ? "🔽 Bezárás" : "📘 Részletek"}
          </button>

          {expanded && (
            <div
              className="mt-2 p-2 rounded"
              style={{ backgroundColor: "#2a2a2a" }}
            >
              <ReactMarkdown>{item.detailed_content}</ReactMarkdown>
            </div>
          )}

          <p
            className="text-muted small mt-2 mb-0"
            style={{ fontSize: "0.7rem" }}
            title={formatFullDate(item.created_at)}
          >
            {formatRelativeTime(item.created_at)}
          </p>
        </div>
      </div>
    );
  }

  // --- CARD NÉZET --- //
  return (
    <div className={`feed-wrapper`}>
      <div
        className="feed-card mb-3 "
        data-source-text={source.toUpperCase()}
        style={{
          
    backgroundColor: "#1e1e1e",
    color: "white",
     borderLeft: `4px solid ${accent}`,// vagy vedd ki
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

            {item.ai_clean === 1 && (
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
            <ReactMarkdown>{item.content}</ReactMarkdown>
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

          <p
            className="text-muted small mt-3 mb-0"
            title={formatFullDate(item.created_at)}
          >
            {formatRelativeTime(item.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
