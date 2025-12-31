"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function CikkOldal() {
  const params = useParams();
  const id = params?.id as string;

  const SOURCE_MAP: Record<number, string> = {
    1: "telex",
    2: "24hu",
    3: "index",
    4: "hvg",
    5: "portfolio",
    6: "444",
  };

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    setLoading(true);

    fetch(`/api/summaries?id=${id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const article = Array.isArray(data) ? data[0] : data;
        setItem(article);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: "40px", maxWidth: "720px", margin: "0 auto" }}>
        {/* skeleton... */}
      </div>
    );
  }

  if (!item || !item.id) {
    return (
      <div style={{ padding: "40px" }}>
        ❌ Cikk nem található.
      </div>
    );
  }

  const source = SOURCE_MAP[item.source_id] || "ismeretlen";
  const sourceClass = `source-${source}`;

  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "720px",
        margin: "0 auto",
        lineHeight: "1.55",
        fontSize: "0.95rem",
      }}
    >
      {/* Fő cím – középre igazítva + nagyobb méret */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        title="Eredeti cikkért kattints ide"
        style={{
          fontSize: "1.5rem", // 2× nagyobb
          fontWeight: 700,
          marginBottom: "20px",
          lineHeight: "1.25",
          color: "#4da3ff",
          textDecoration: "none",
          display: "block",
          textAlign: "center",
          transition: "color 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#77b8ff")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#4da3ff")}
      >
        {item.title}
      </a>

      {/* Meta badge sor */}
      <div className="d-flex align-items-center gap-2 mb-4 justify-content-center">
        <span
          className={`badge ${sourceClass}`}
          style={{ fontSize: "0.75rem", fontWeight: "bold" }}
          title={`Forrás: ${item.source_name}`}
        >
          {item.source_name.toUpperCase()}
        </span>

        <span
          className="badge badge-date"
          style={{
            fontSize: "0.75rem",
            fontWeight: "bold",
            backgroundColor: "#333",
            color: "#ccc",
          }}
          title={new Date(item.created_at).toLocaleString("hu-HU")}
        >
          {new Date(item.created_at).toLocaleDateString("hu-HU")}
        </span>

        {item.ai_clean === 1 && (
          <span
            className={`badge ${sourceClass}`}
            style={{ fontSize: "0.75rem", fontWeight: "bold" }}
            title="Ez a tartalom teljes egészében AI által lett megfogalmazva."
          >
            AI-fogalmazás
          </span>
        )}
      </div>

      {/* Rövid tartalom – Neon Mono (1.5× nagyobb) */}
      <div style={{ marginBottom: "26px" }}>
        <p
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "1.1rem", // 1.5× nagyobb
            fontWeight: 400,
            marginBottom: "0px",
            lineHeight: "1.55",
            color: "#e0e0e0",
            textAlign: "justify",
            letterSpacing: "0.3px",
            textShadow: "0 0 4px rgba(0, 234, 255, 0.25)",
          }}
        >
          {item.content}
        </p>
      </div>

      {/* Részletes tartalom – Neon Mono (változatlan) */}
      <div
        style={{
          marginTop: "28px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            whiteSpace: "pre-line",
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.85rem",
            fontWeight: 400,
            lineHeight: "1.6",
            color: "#e0e0e0",
            textAlign: "justify",
            letterSpacing: "0.3px",
            textShadow: "0 0 4px rgba(0, 234, 255, 0.25)",
          }}
        >
          {item.detailed_content}
        </div>
      </div>
    </div>
  );
}
