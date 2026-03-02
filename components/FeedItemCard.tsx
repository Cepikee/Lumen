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

/** Map source id to readable name and Tailwind badge / border classes */
function getSourceInfo(sourceId: number) {
  switch (sourceId) {
    case 1:
      return { key: "telex", badge: "bg-[#00AEEF] text-white", border: "border-l-4 border-[#00AEEF]" };
    case 2:
      return { key: "24hu", badge: "bg-[#ff0000] text-white", border: "border-l-4 border-[#ff0000]" };
    case 3:
      return { key: "index", badge: "bg-[#e0e274] text-white", border: "border-l-4 border-[#e0e274]" };
    case 4:
      return { key: "hvg", badge: "bg-[#ff7a00] text-white", border: "border-l-4 border-[#ff7a00]" };
    case 5:
      return { key: "portfolio", badge: "bg-[#ff6600] text-white", border: "border-l-4 border-[#ff6600]" };
    case 6:
      return { key: "444", badge: "bg-[#2d6126] text-white", border: "border-l-4 border-[#2d6126]" };
    case 7:
      return { key: "origo", badge: "bg-[#0e008a] text-white", border: "border-l-4 border-[#0e008a]" };
    default:
      return { key: "ismeretlen", badge: "bg-gray-300 text-black", border: "border-l-4 border-gray-300" };
  }
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
  const sourceInfo = getSourceInfo(item.source_id);
  const sourceText = sourceInfo.key.toUpperCase();

  // Common Tailwind classes to mimic previous styling
  const wrapperFont = inter.className; // applies Inter
  const baseTextClasses = "text-[17px] leading-[1.5] font-medium tracking-[0.2px] text-[var(--feed-text)]";
  const titleClasses = "text-[1.15rem] leading-[1.3] font-semibold text-[#4da3ff] no-underline";
  const detailedClasses = "text-[15px] leading-[1.75] text-[var(--feed-text)] tracking-[0.2px]";

  // AI badge style (boxed)
  const aiBadgeClasses = "inline-block px-2 py-0.5 rounded text-[0.65rem] font-bold border border-black";

  if (viewMode === "compact") {
    return (
      <div className={`${wrapperFont} feed-wrapper compact`}>
        <div
          className={`feed-card compact mb-2 p-2 rounded theme-card ${sourceInfo.border}`}
          data-source-text={sourceText}
          onClick={() => {
            window.location.href = `/cikk/${item.id}`;
          }}
          style={{ backgroundColor: "var(--bs-body-bg)" }}
        >
          <div className="flex justify-between">
            <div className="flex items-start gap-2">
              <span className={`inline-block text-[0.65rem] font-bold px-2 py-0.5 rounded ${sourceInfo.badge}`}>
                {sourceText}
              </span>

              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`title-compact ${titleClasses} max-w-[60%] line-clamp-2`}
                onClick={(e) => e.stopPropagation()}
              >
                {item.title}
              </a>
            </div>

            {item.ai_clean === 1 && (
              <span
                className={`${aiBadgeClasses} bg-[#00AEEF] text-white`}
                title="Ez a tartalom teljes egészében AI által lett megfogalmazva."
              >
                🤖 AI
              </span>
            )}
          </div>

          <div className={`mt-1 ${expanded ? "" : "line-clamp-2"} content-compact ${baseTextClasses} mt-2`}>
            <ReactMarkdown>{item.content}</ReactMarkdown>
          </div>

          <button
            className="btn-link mt-2 text-sm text-sky-500 hover:underline p-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggle();
            }}
          >
            {expanded ? "🔽 Bezárás" : "📘 Részletek"}
          </button>

          {expanded && (
            <div className="mt-2 p-2 rounded theme-card-inner" style={{ backgroundColor: "var(--bs-body-bg)" }}>
              <div className={detailedClasses}>
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
              <span className="category-compact text-[0.85rem] opacity-95 uppercase">{item.category}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // CARD view
  return (
    <div className={`${wrapperFont} feed-wrapper`}>
      <div
        className={`feed-card mb-3 p-3 rounded shadow-sm theme-card ${sourceInfo.border}`}
        data-source-text={sourceText}
        onClick={() => {
          window.location.href = `/cikk/${item.id}`;
        }}
        style={{ backgroundColor: "var(--bs-body-bg)" }}
      >
        <div className="card-body relative z-10">
          <h5 className="card-title flex justify-between items-start m-0">
            <div className="flex items-start gap-2 max-w-[78%]">
              <span className={`inline-block font-bold text-[0.75rem] px-2 py-0.5 rounded ${sourceInfo.badge}`}>
                {sourceText}
              </span>

              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${titleClasses} title-card max-w-full line-clamp-2`}
                onClick={(e) => e.stopPropagation()}
              >
                {item.title}
              </a>
            </div>

            {item.ai_clean === 1 && (
              <span
                className={`${aiBadgeClasses} bg-[#00AEEF] text-white ml-2`}
                title="Ez a tartalom teljes egészében AI által lett megfogalmazva."
              >
                AI‑fogalmazás
              </span>
            )}
          </h5>

          <div className={`mt-2 content-card ${baseTextClasses}`}>
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
            <div className="mt-3 p-3 rounded theme-card-inner" style={{ backgroundColor: "var(--bs-body-bg)" }}>
              <div className={detailedClasses}>
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
              <span className="category-card text-[0.9rem] opacity-95 uppercase">{item.category}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

//*STABIL VERZIÓ, NEM SZABAD MÓDOSÍTANI*//
