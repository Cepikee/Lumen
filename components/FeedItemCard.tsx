"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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

  // Tailwind utility classes used:
  // - font: inter via inter.className
  // - base text: text-[17px] leading-[1.5] font-medium text-[var(--feed-text)]
  // - title: text-[1.15rem] leading-[1.3] font-semibold text-[#4da3ff]
  // - detailed: text-[15px] leading-[1.75]
  // - backgrounds use bg-[var(--bs-body-bg)]
  // - clamp uses line-clamp-2 (Tailwind line-clamp plugin expected)

  if (viewMode === "compact") {
    return (
      <div className={`${inter.className} feed-wrapper compact`}>
        <div
          data-source-text={source.toUpperCase()}
          onClick={() => {
            window.location.href = `/cikk/${item.id}`;
          }}
          className="feed-card compact mb-2 p-2 rounded theme-card bg-[var(--bs-body-bg)]"
        >
          <div className="flex justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block text-[0.65rem] font-bold px-2 py-0.5 rounded ${sourceClass}`}
                aria-hidden
              >
                {source.toUpperCase()}
              </span>

              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="title-compact text-[1.15rem] leading-[1.3] font-semibold text-[#4da3ff] no-underline"
                onClick={(e) => e.stopPropagation()}
              >
                {item.title}
              </a>
            </div>

            {item.ai_clean === 1 && (
              <span
                className={`inline-block text-[0.65rem] font-bold px-2 py-0.5 rounded ${sourceClass}`}
                title="Ez a tartalom teljes egészében AI által lett megfogalmazva."
              >
                🤖 AI
              </span>
            )}
          </div>

          <div
            className={`mt-1 content-compact text-[17px] leading-[1.5] font-medium text-[var(--feed-text)] tracking-[0.2px] ${expanded ? "" : "line-clamp-2"}`}
          >
            <ReactMarkdown>{item.content}</ReactMarkdown>
          </div>

          <button
            className="mt-1 text-sm text-sky-500 hover:underline p-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggle();
            }}
          >
            {expanded ? "🔽 Bezárás" : "📘 Részletek"}
          </button>

          {expanded && (
            <div className="mt-2 p-2 rounded theme-card-inner bg-[var(--bs-body-bg)]">
              <div className="text-[15px] leading-[1.75] text-[var(--feed-text)] tracking-[0.2px]">
                <ReactMarkdown>{item.detailed_content}</ReactMarkdown>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-2">
            <p
              className="text-muted text-[0.9rem] mb-0"
              title={formatFullDate(item.created_at)}
              style={{ color: "var(--article-muted)" }}
            >
              {formatRelativeTime(item.created_at)}
            </p>

            {item.category && (
              <span className="category-compact text-[0.85rem] opacity-95 uppercase">
                {item.category}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${inter.className} feed-wrapper`}>
      <div
        data-source-text={source.toUpperCase()}
        onClick={() => {
          window.location.href = `/cikk/${item.id}`;
        }}
        className="feed-card mb-3 p-3 rounded shadow-sm theme-card bg-[var(--bs-body-bg)]"
      >
        <div className="card-body relative z-10">
          <h5 className="card-title flex justify-between items-center m-0">
            <div className="flex items-center gap-2">
              <span
                className={`me-2 inline-block font-bold text-[0.75rem] px-2 py-0.5 rounded ${sourceClass}`}
                aria-hidden
              >
                {source.toUpperCase()}
              </span>

              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="title-card no-underline text-[1.15rem] leading-[1.3] font-semibold text-[#4da3ff] max-w-[70%] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {item.title}
              </a>
            </div>

            {item.ai_clean === 1 && (
              <span
                className={`inline-block font-bold px-2 py-0.5 rounded ${sourceClass}`}
                title="Ez a tartalom teljes egészében AI által lett megfogalmazva."
              >
                AI‑fogalmazás
              </span>
            )}
          </h5>

          <div className="mt-2 content-card text-[17px] leading-[1.5] font-medium text-[var(--feed-text)] tracking-[0.2px]">
            <ReactMarkdown>{item.content}</ReactMarkdown>
          </div>

          <button
            className="mt-2 text-sm text-sky-500 hover:underline p-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggle();
            }}
          >
            {expanded ? "🔽 Bezárás" : "📘 Részletes elemzésért kattints ide!"}
          </button>

          {expanded && (
            <div className="mt-3 p-3 rounded theme-card-inner bg-[var(--bs-body-bg)]">
              <div className="text-[15px] leading-[1.75] text-[var(--feed-text)] tracking-[0.2px]">
                {item.detailed_content ? (
                  <ReactMarkdown>{item.detailed_content}</ReactMarkdown>
                ) : (
                  <p className="text-warning text-sm mb-0">Ehhez a hírhez nincs elmentve részletes elemzés.</p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-3">
            <p
              className="text-muted text-[0.95rem] mb-0"
              title={formatFullDate(item.created_at)}
              style={{ color: "var(--article-muted)" }}
            >
              {formatRelativeTime(item.created_at)}
            </p>

            {item.category && (
              <span className="category-card text-[0.9rem] opacity-95 uppercase">
                {item.category}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

//*STABIL VERZIÓ, NEM SZABAD MÓDOSÍTANI*//
