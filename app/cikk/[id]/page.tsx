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
<div style={{ marginBottom: "24px" }}>
  {/* Felső badge sor */}
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "12px",
      marginBottom: "10px",
      flexWrap: "wrap",
    }}
  >
    {/* Forrás badge */}
    <span
      className={`badge ${sourceClass}`}
      style={{
        fontSize: "0.8rem",
        fontWeight: 600,
        padding: "4px 10px",
        borderRadius: "6px",
        backgroundColor: "#222",
        color: "#eee",
        minWidth: "70px",
        textAlign: "center",
      }}
      title={`Forrás: ${source}`}
    >
      {source.toUpperCase()}
    </span>
    {/* AI-fogalmazás badge (ugyanaz a stílus, sourceClass-szal) */}
    {item.ai_clean === 1 && (
      <span
        className={`badge ${sourceClass}`}
        style={{
          fontSize: "0.8rem",
          fontWeight: 600,
          padding: "4px 10px",
          borderRadius: "6px",
          backgroundColor: "#222",
          color: "#eee",
          minWidth: "90px",
          textAlign: "center",
        }}
        title="Ez a tartalom teljes egészében AI által lett megfogalmazva."
      >
        AI-fogalmazás
      </span>
    )}
  </div>

  {/* Feldolgozva: dátum */}
  <div
  style={{
    fontSize: "0.85rem",
    color: "#ccc",
    textAlign: "left",
    marginTop: "4px",
    letterSpacing: "0.3px",
  }}
>
  Feldolgozva:{" "}
  <span style={{ color: "#e0e0e0", fontWeight: 500 }}>
    {item.created_at
      ? new Date(item.created_at)
          .toLocaleString("hu-HU", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
          .replace(/\s/g, "")
      : ""}
  </span>
</div>
</div>

      {/* Rövid tartalom */}
      <div style={{ marginBottom: "26px" }}>
        <p
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.92rem",
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
{/* Elválasztó vonal */}
<div
  style={{
    width: "100%",
    height: "1px",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    margin: "26px 0 28px 0",
  }}
></div>

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
{/* Elválasztó vonal */}
<div
  style={{
    width: "100%",
    height: "1px",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    margin: "26px 0 28px 0",
  }}
></div>



{/* Kulcsszavak hashtag formában */}
{item.keywords && item.keywords.length > 0 && (
  <div
    style={{
      marginTop: "22px",
      marginBottom: "32px",
      display: "flex",
      flexWrap: "wrap",
      gap: "12px",
    }}
  >
    {item.keywords.map((kw: string, i: number) => (
      <span
        key={i}
        style={{
          fontSize: "0.78rem",
          color: "#ffffff",
          fontWeight: 400,
          letterSpacing: "0.25px",
        }}
      >
        #{kw}
      </span>
    ))}
  </div>
)}







      {/* Kapcsolódó cikkek blokk */}
{/* Kapcsolódó cikkek – egysoros, scrollozható dobozok */}
{/* Kapcsolódó cikkek – egymás alatt, fekete dobozok */}
<div style={{ marginTop: 48 }}>
  <h4
    style={{
      fontSize: "0.9rem",
      marginBottom: 18,
      color: "#ffffff",
      textAlign: "center",
      fontWeight: 500,
      letterSpacing: "0.3px",
      textTransform: "uppercase",
      fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
    }}
  >
    Kapcsolódó cikkek
  </h4>

  {!relatedLoading && related.length > 0 && (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {related.map((r) => {
        // CSS kulcs előállítása
        const cssKey =
          "source-" +
          (r.source_name
            ?.toLowerCase()
            .replace(".hu", "")
            .replace(/\./g, "")
            .trim() || "");

        // Színtérkép a CSS alapján
        const sourceColors: Record<string, string> = {
          "source-444": "#2d6126",
          "source-index": "rgba(224, 226, 116, 0.747)",
          "source-portfolio": "#ff6600",
          "source-24hu": "#ff0000",
          "source-telex": "#00AEEF",
          "source-hvg": "#ff7a00",
          default: "#4da3ff",
        };

        const dotColor = sourceColors[cssKey] || sourceColors.default;

        return (
          <a
            key={r.id}
            href={`/cikk/${r.id}`}
            style={{
              backgroundColor: "#111",
              padding: "12px 16px",
              borderRadius: "8px",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 10,
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#1a1a1a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#111";
            }}
          >
            {/* Pont a cím előtt */}
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: dotColor,
                display: "inline-block",
              }}
            />

            {/* Cím */}
            <span
              style={{
                fontSize: "0.9rem",
                fontWeight: 500,
                color: "#ffffff",
                lineHeight: 1.35,
              }}
            >
              {r.title}
            </span>
          </a>
        );
      })}

    </div>
  )}
</div>


    </div>
  );
}
