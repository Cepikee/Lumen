"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useUserStore } from "@/store/useUserStore";

function mapSource(raw: string) {
  const s = raw.toLowerCase();
  if (s.includes("telex")) return "telex";
  if (s.includes("24")) return "24hu";
  if (s.includes("index")) return "index";
  if (s.includes("hvg")) return "hvg";
  if (s.includes("portfolio")) return "portfolio";
  if (s.includes("444")) return "444";
  if (s.includes("origo")) return "origo"; 
  return "ismeretlen";
}

export default function CikkOldal() {
  const params = useParams();
  const id = params?.id as string;

  const theme = useUserStore((s) => s.theme);

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [related, setRelated] = useState<any[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState<string | null>(null);

  // ⭐ SYSTEM THEME FIX — mindig legyen theme-light vagy theme-dark a <html>-en
  useEffect(() => {
    const root = document.documentElement;

    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;

    root.classList.remove("theme-light", "theme-dark");
    root.classList.add(`theme-${resolved}`);
  }, [theme]);

  // Cikk lekérése
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
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Kapcsolódó cikkek
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
        setRelated(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setRelated([]);
        setRelatedError("Hiba a kapcsolódó cikkek lekérésekor.");
      })
      .finally(() => setRelatedLoading(false));
  }, [item]);

  if (loading) {
    return (
      <div className={`article-container`}>
        <div className="article-inner">Betöltés…</div>
      </div>
    );
  }

  if (!item || !item.id) {
    return (
      <div className={`article-container`}>
        <div className="article-inner">❌ Cikk nem található.</div>
      </div>
    );
  }

  const rawSource = item.source ?? item.source_name ?? "";
  const source = mapSource(rawSource);
  const sourceClass = `source-${source}`;

  return (
    <div className={`article-container`}>
      <div className="article-inner">

        {/* CÍM */}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="article-title"
        >
          {item.title}
        </a>

        {/* META */}
        <div className="article-meta">
          <div className="article-meta-badges">
            <span className={`badge ${sourceClass} meta-badge`}>
              {source.toUpperCase()}
            </span>

            {item.ai_clean === 1 && (
              <span className={`badge ${sourceClass} meta-badge`}>
                AI‑fogalmazás
              </span>
            )}
          </div>

          <div className="article-date">
            Feldolgozva:{" "}
            <span className="article-date-strong">
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

        {/* RÖVID TARTALOM */}
        <p className="article-summary">{item.content}</p>

        <div className="article-divider"></div>

        {/* RÉSZLETES TARTALOM */}
        <div className="article-detailed">
          {item.detailed_content}
        </div>

        <div className="article-divider"></div>

        {/* KULCSSZAVAK */}
        {item.keywords && item.keywords.length > 0 && (
          <div className="article-keywords">
            {item.keywords.map((kw: string, i: number) => (
              <span key={i} className="article-keyword">#{kw}</span>
            ))}
          </div>
        )}

        {/* KAPCSOLÓDÓ CIKKEK */}
        <div className="related-container">
          <h4 className="related-title">Kapcsolódó cikkek</h4>

          {!relatedLoading && related.length > 0 && (
            <div className="related-list">
              {related.map((r) => {
                const cssKey =
                  "source-" +
                  (r.source_name
                    ?.toLowerCase()
                    .replace(".hu", "")
                    .replace(/\./g, "")
                    .trim() || "");

                const sourceColors: Record<string, string> = {
                  "source-444": "#2d6126",
                  "source-index": "rgba(224, 226, 116, 0.747)",
                  "source-portfolio": "#ff6600",
                  "source-24hu": "#ff0000",
                  "source-telex": "#00AEEF",
                  "source-hvg": "#ff7a00",
                  "source-origo": "#0e008a",
                  default: "#4da3ff",
                };

                const dotColor = sourceColors[cssKey] || sourceColors.default;

                return (
                  <a key={r.id} href={`/cikk/${r.id}`} className="related-box">
                    <span className="related-dot" style={{ backgroundColor: dotColor }} />
                    <span className="related-title-text">{r.title}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
