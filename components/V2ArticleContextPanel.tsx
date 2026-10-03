"use client";

import { useV2ArticleContext, type V2ArticleContextFetcher } from "@/hooks/useV2ArticleContext";

export default function V2ArticleContextPanel({ articleId, enabled, fetcher }: { articleId: number; enabled?: boolean; fetcher?: V2ArticleContextFetcher }) {
  const state = useV2ArticleContext(articleId, enabled, fetcher);
  if (state.status === "disabled" || state.status === "idle") return null;
  if (state.status === "loading") return <section aria-label="V2 kontextus" className="article-v2-context">Kontextus betöltése…</section>;
  if (state.status === "error") return <section aria-label="V2 kontextus" className="article-v2-context">A kontextus jelenleg nem érhető el.</section>;
  if (!state.data || state.status === "empty") return <section aria-label="V2 kontextus" className="article-v2-context">Nincs további kontextus.</section>;
  return <section aria-label="V2 kontextus" className="article-v2-context"><h4>Kontextus</h4>{state.data.article.summary?.text ? <p>{state.data.article.summary.text}</p> : null}{state.data.timeline.items.length ? <div><strong>Idővonal</strong><ul>{state.data.timeline.items.map((item: { type: string | null; id: number | null; displayAt: string | null }, index: number) => <li key={`${item.type}-${item.id ?? "unknown"}-${index}`}>{item.type || "Esemény"}{item.displayAt ? ` · ${new Date(item.displayAt).toLocaleString("hu-HU")}` : ""}</li>)}</ul></div> : null}</section>;
}
