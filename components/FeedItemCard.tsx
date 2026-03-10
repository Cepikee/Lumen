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

function getSourceColor(sourceId: number) {
  switch (sourceId) {
    case 1: return "#00AEEF";
    case 2: return "#ff0000";
    case 3: return "rgba(224,226,116,0.747)";
    case 4: return "#ff7a00";
    case 5: return "#ff6600";
    case 6: return "#2d6126";
    case 7: return "#0e008a";
    default: return "#d1d5db";
  }
}

function getSourceKey(sourceId: number) {
  switch (sourceId) {
    case 1: return "telex";
    case 2: return "24hu";
    case 3: return "index";
    case 4: return "hvg";
    case 5: return "portfolio";
    case 6: return "444";
    case 7: return "origo";
    default: return "ismeretlen";
  }
}

export default function FeedItemCard({
  item,
  viewMode,
}: {
  item: FeedItem;
  viewMode: "card" | "compact";
}) {
  const url = item.url || "";
  const sourceKey = getSourceKey(item.source_id);
  const sourceText = sourceKey.toUpperCase();
  const borderColor = getSourceColor(item.source_id);

  const wrapperFont = inter.className;

  // CARD = eredeti
  // COMPACT = fele méret
  const isCompact = viewMode === "compact";

  return (
    <div className={`${wrapperFont}`}>
      <Link href={`/cikk/${item.id}`} className="block no-underline">
        <div
          className={`
            feed-card
            rounded shadow-sm theme-card border-l-4 cursor-pointer
            hover:shadow-lg transition-all duration-200
            ${isCompact ? "p-2 mb-2 text-sm" : "p-4 mb-4 text-base"}
          `}
          data-source-text={sourceText}
          style={{
            backgroundColor: "var(--bs-body-bg)",
            borderLeftColor: borderColor,
          }}
        >
          <div className="card-body relative z-10">

            {/* HEADER */}
            <h5
              className={`
                card-title flex justify-between items-start m-0
                ${isCompact ? "text-[0.9rem]" : "text-[1.15rem]"}
              `}
            >
              <div className="flex items-center gap-3 max-w-[78%]">
                <span className={`badge source-${sourceKey} ${isCompact ? "scale-75" : ""}`}>
                  {sourceText}
                </span>

                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`
                    line-clamp-2 !no-underline font-semibold text-[#4da3ff] hover:text-[#77b8ff]
                    ${isCompact ? "text-[0.9rem]" : "text-[1.15rem]"}
                  `}
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.title}
                </a>
              </div>

              {item.ai_clean === 1 && (
                <span
                  className={`badge source-${sourceKey} ${isCompact ? "scale-75" : ""}`}
                  title="Ez a tartalom teljes egészében AI által lett megfogalmazva."
                >
                  AI‑fogalmazás
                </span>
              )}
            </h5>

            {/* SUMMARY */}
            <div
              className={`
                mt-3 text-[var(--feed-text)]
                ${isCompact ? "text-[0.8rem] leading-[1.3]" : "text-[1rem] leading-[1.6]"}
              `}
            >
              <ReactMarkdown>{item.content}</ReactMarkdown>
            </div>

            {/* FOOTER */}
            <div
              className={`
                flex items-center justify-between mt-3
                ${isCompact ? "text-[0.7rem]" : "text-[0.95rem]"}
              `}
            >
              <p
                className="mb-0"
                title={formatFullDate(item.created_at)}
                style={{ color: "var(--article-muted)" }}
              >
                {formatRelativeTime(item.created_at)}
              </p>

              <p
                className={`
                  opacity-50 tracking-wide text-sky-500 text-center flex-1 px-4 whitespace-nowrap overflow-hidden text-ellipsis
                  ${isCompact ? "text-[0.55rem]" : "text-[0.65rem]"}
                `}
              >
                Részletes elemzés megtekintéséhez kattintson a kártyára
              </p>

              {item.category && (
                <span className={`uppercase ${isCompact ? "text-[0.6rem]" : ""}`}>
                  {item.category}
                </span>
              )}
            </div>

          </div>
        </div>
      </Link>
    </div>
  );
}
