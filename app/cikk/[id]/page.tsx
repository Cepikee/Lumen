"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

// 🔥 Régi, jól működő SOURCE‑logika visszahozva
function mapSource(raw: string) {
  const s = raw.toLowerCase();

  if (s.includes("telex")) return "telex";
  if (s.includes("24")) return "24hu";
  if (s.includes("index")) return "index";
  if (s.includes("hvg")) return "hvg";
  if (s.includes("portfolio")) return "portfolio";
  if (s.includes("444")) return "444";

  return "ismeretlen";
}

export default function CikkOldal() {
  const params = useParams();
  const id = params?.id as string;

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Kapcsolódó cikkek state
  const [related, setRelated] = useState<any[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setItem(null);
    setRelated([]);
    setRelatedError(null);

    fetch(`/api/summaries?id=${id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const article = Array.isArray(data) ? data[0] : data;
        setItem(article || null);
      })
      .catch((err) => {
        console.error("summaries fetch error:", err);
        setItem(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Kapcsolódó cikkek lekérése — már a mapSource alapján
  useEffect(() => {
    if (!item) return;

    const rawSource = item.source ?? item.source_name ?? "";
    const normalized = mapSource(rawSource);

    if (!normalized || normalized === "ismeretlen") {
      setRelated([]);
      setRelatedError("Nincs használható forrás a kapcsolódó cikkekhez.");
      return;
    }

    setRelatedLoading(true);
    setRelatedError(null);

    fetch(`/api/related?source=${normalized}&exclude=${item.id}&limit=5`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRelated(data);
        } else {
          setRelated([]);
        }
      })
      .catch((err) => {
        console.error("related fetch error:", err);
        setRelated([]);
        setRelatedError("Hiba a kapcsolódó cikkek lekérésekor.");
      })
      .finally(() => setRelatedLoading(false));
  }, [item]);

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

  // 🔥 VISSZAÁLLÍTOTT META LOGIKA
  const rawSource = item.source ?? item.source_name ?? "";
  const source = mapSource(rawSource);
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
      {/* Fő cím */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        title="Eredeti cikkért kattints ide"
        style={{
          fontSize: "1.5rem",
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
          title={`Forrás: ${source}`}
        >
          {source.toUpperCase()}
        </span>

        <span
          className="badge badge-date"
          style={{
            fontSize: "0.75rem",
            fontWeight: "bold",
            backgroundColor: "#333",
            color: "#ccc",
          }}
          title={item.created_at ? new Date(item.created_at).toLocaleString("hu-HU") : ""}
        >
          {item.created_at ? new Date(item.created_at).toLocaleDateString("hu-HU") : ""}
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

      {/* Rövid tartalom */}
      <div style={{ marginBottom: "26px" }}>
        <p
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "1.1rem",
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

      {/* Részletes tartalom */}
      <div style={{ marginTop: "28px", marginBottom: "20px" }}>
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

      {/* Kapcsolódó cikkek blokk */}
      <div style={{ marginTop: "40px" }}>
        <h3
          style={{
            fontSize: "1.4rem",
            marginBottom: "16px",
            color: "#4da3ff",
            textAlign: "center",
            fontWeight: 600,
            textShadow: "0 0 6px rgba(0, 234, 255, 0.25)",
          }}
        >
          Kapcsolódó cikkek
        </h3>

        {relatedLoading && <div style={{ textAlign: "center", color: "#999" }}>Betöltés…</div>}

        {!relatedLoading && relatedError && (
          <div style={{ textAlign: "center", color: "#ff8a8a" }}>{relatedError}</div>
        )}

        {!relatedLoading && related.length === 0 && !relatedError && (
          <div style={{ textAlign: "center", color: "#999" }}>
            Nincsenek kapcsolódó cikkek.
          </div>
        )}

        {!relatedLoading && related.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {related.map((r) => (
              <a
                key={r.id}
                href={`/cikk/${r.id}`}
                style={{
                  padding: "12px 16px",
                  backgroundColor: "#1a1a1a",
                  borderRadius: "8px",
                  textDecoration: "none",
                  color: "white",
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: "0.9rem",
                  letterSpacing: "0.3px",
                  boxShadow: "0 0 6px rgba(0, 234, 255, 0.15)",
                  transition: "background 0.2s ease",
                }}
              >
                {r.title}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
