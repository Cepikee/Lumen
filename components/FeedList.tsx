"use client";
import ReactMarkdown from "react-markdown";

interface FeedItem {
  id: number;
  url: string;
  content?: string;
  detailed_content?: string;
  ai_clean?: number | string;
  created_at?: string;
}

interface Props {
  items: FeedItem[];
  expandedId: number | null;
  setExpandedId: (id: number | null) => void;
}

export default function FeedList({ items, expandedId, setExpandedId }: Props) {
  if (!items || items.length === 0) return <p>Nincs még összefoglalás.</p>;

  return (
    <>
      <h2 className="mb-4">📰 Friss hírek</h2>
      {items.map((item) => (
        <div
          key={item.id}
          className={`card mb-3 shadow ${
            item.url?.includes("telex.hu") ? "telex-card" : "bg-secondary text-light"
          }`}
        >
          <div className="card-body">
            <h5 className="card-title d-flex justify-content-between align-items-center">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-decoration-none text-info"
              >
                {item.url}
              </a>
              {Number(item.ai_clean) === 1 && (
                <span className="badge-ai">100% AI–fogalmazás</span>
              )}
            </h5>

            <ReactMarkdown>{item.content ?? ""}</ReactMarkdown>

            <button
              className="btn btn-link p-0 mt-2 text-info"
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
            >
              {expandedId === item.id
                ? "🔽 Bezárás"
                : "📖 Részletes elemzésért kattints ide!"}
            </button>

            {expandedId === item.id && (
              <div className="mt-2">
                {item.detailed_content && item.detailed_content.length > 0 ? (
                  <ReactMarkdown>{item.detailed_content}</ReactMarkdown>
                ) : (
                  <p className="text-warning small mb-0">
                    Ehhez a hírhez nincs elmentve részletes elemzés.
                  </p>
                )}
              </div>
            )}

            <p className="text-muted small mt-3 mb-0">
              {item.created_at ? new Date(item.created_at).toLocaleString("hu-HU") : ""}
            </p>
          </div>
        </div>
      ))}
    </>
  );
}
