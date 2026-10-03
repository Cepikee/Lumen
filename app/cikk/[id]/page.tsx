"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useUserStore } from "@/store/useUserStore";
import V2ArticleContextPanel from "@/components/V2ArticleContextPanel";

function mapSource(raw: unknown) {
  const s = typeof raw === "string" ? raw.toLowerCase() : "";
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
  const rawId = params?.id;
  const id = typeof rawId === "string" ? rawId.trim() : "";

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
    setRelatedLoading(false);
    setRelated([]);
    setRelatedError(null);

    if (!/^\d+$/.test(id) || Number(id) < 1 || !Number.isSafeInteger(Number(id))) {
      setItem(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setItem(null);

    fetch(`/api/summaries?id=${id}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`article_http_${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const article = Array.isArray(data) ? data[0] : data;
        setItem(
          article && typeof article === "object" && Number.isSafeInteger(Number(article.id))
            ? article
            : null,
        );
      })
      .catch(() => { if (!cancelled) setItem(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  // Kapcsolódó cikkek
  useEffect(() => {
    if (!item || !Number.isSafeInteger(Number(item.id))) {
      setRelatedLoading(false);
      setRelated([]);
      return;
    }

    const rawSource = item.source_name || item.source || "";
    const normalized = mapSource(rawSource);

    if (!normalized || normalized === "ismeretlen") {
      setRelatedLoading(false);
      setRelated([]);
      setRelatedError("Nincs használható forrás a kapcsolódó cikkekhez.");
      return;
    }

    setRelatedLoading(true);
    setRelatedError(null);
    let cancelled = false;

    fetch(`/api/related?source=${normalized}&exclude=${item.id}&limit=5`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`related_http_${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const candidates = Array.isArray(data) ? data : [];
        const seen = new Set<number>();
        setRelated(
          candidates
            .filter((candidate) => candidate && Number.isSafeInteger(Number(candidate.id)) && Number(candidate.id) > 0)
            .filter((candidate) => {
              const candidateId = Number(candidate.id);
              if (candidateId === Number(item.id) || seen.has(candidateId)) return false;
              seen.add(candidateId);
              return true;
            })
            .map((candidate) => ({
              ...candidate,
              title: typeof candidate.title === "string" && candidate.title.trim()
                ? candidate.title.trim()
                : "Cím nélkül",
            })),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setRelated([]);
        setRelatedError("Hiba a kapcsolódó cikkek lekérésekor.");
      })
      .finally(() => { if (!cancelled) setRelatedLoading(false); });
    return () => { cancelled = true; };
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

  // Use the same source precedence as the related-news request. A stale or
  // noncanonical `source` field must not disagree with the canonical joined
  // source name used to load related articles.
  const rawSource = item.source_name ?? item.source ?? "";
  const source = mapSource(rawSource);
  const sourceClass = `source-${source}`;

  return (
    <div className={`article-container`}>
      <div className="article-inner">

        {/* CÍM */}
        {typeof item.url === "string" && item.url.trim() ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="article-title"
          >
            {typeof item.title === "string" && item.title.trim() ? item.title : "Cím nélkül"}
          </a>
        ) : (
          <span className="article-title">{typeof item.title === "string" && item.title.trim() ? item.title : "Cím nélkül"}</span>
        )}

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
              {(() => {
                if (!item.created_at) return "";
                const parsed = new Date(item.created_at);
                return Number.isNaN(parsed.getTime())
                  ? ""
                  : parsed.toLocaleString("hu-HU", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).replace(/\s/g, "");
              })()}
            </span>
          </div>
        </div>

        {/* RÖVID TARTALOM */}
        <p className="article-summary">{typeof item.content === "string" ? item.content : ""}</p>

        <V2ArticleContextPanel articleId={Number(item.id)} />

        <div className="article-divider"></div>

        {/* RÉSZLETES TARTALOM */}
        <div className="article-detailed">
          {typeof item.detailed_content === "string" ? item.detailed_content : ""}
        </div>

        <div className="article-divider"></div>

        {/* KULCSSZAVAK */}
        {Array.isArray(item.keywords) && item.keywords.some((kw: unknown) => typeof kw === "string" && kw.trim().length > 0) && (
          <div className="article-keywords">
            {item.keywords.filter((kw: unknown): kw is string => typeof kw === "string" && kw.trim().length > 0).map((kw: string, i: number) => (
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
                const relatedSource = mapSource(r.source_name ?? r.source);
                const cssKey = "source-" + (relatedSource || "");

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
                  <a key={r.id} href={`/cikk/${Number(r.id)}`} className="related-box">
                    <span className="related-dot" style={{ backgroundColor: dotColor }} />
                  <span className="related-title-text">{r.title || "Cím nélkül"}</span>
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
