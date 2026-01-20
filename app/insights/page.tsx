// app/insights/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import InsightList from "@/components/InsightList";
import InsightFilters from "@/components/InsightFilters"; // meglévő komponens
import ThemeSync from "@/components/ThemeSync"; // ThemeSync komponens, szinkronizálja a Zustand theme-et a DOM-mal

type LocalRawCategory = {
  category: string | null;
  trendScore: number;
  articleCount: number;
  sourceDiversity?: number | string;
  lastArticleAt?: string | null;
};

function normalizeCategory(raw?: string | null) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (s.toLowerCase() === "null") return null;
  return s;
}

/** Type guard */
function isRawCategory(obj: unknown): obj is LocalRawCategory {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    ("category" in o) &&
    (typeof o.category === "string" || o.category === null) &&
    ("trendScore" in o) &&
    (typeof o.trendScore === "number") &&
    ("articleCount" in o) &&
    (typeof o.articleCount === "number")
  );
}

export default function InsightFeedPage() {
  const [categoryTrends, setCategoryTrends] = useState<LocalRawCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // period: időablak (7d/30d/90d)
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");
  // sort: a meglévő InsightFilters komponens által használt aktív filter string
  const [sort, setSort] = useState<string>("Legfrissebb");

  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    async function load() {
      setLoading(true);
      try {
        // period és sort is elküldjük az API-nak, ha támogatja
        const q = new URLSearchParams();
        q.set("period", period);
        q.set("sort", sort);
        const res = await fetch(`/api/insights?${q.toString()}`, { cache: "no-store" });
        if (!res.ok) {
          if (mounted.current) setCategoryTrends([]);
          return;
        }
        const json: unknown = await res.json();
        if (!mounted.current) return;

        // Ha van categories tömb
        if (Array.isArray((json as any)?.categories) && (json as any).categories.length > 0) {
          const rawCats = (json as any).categories as unknown[];
          const filtered: LocalRawCategory[] = rawCats
            .filter(isRawCategory)
            .filter((c) => normalizeCategory(c.category) !== null);
          if (mounted.current) setCategoryTrends(filtered);
          return;
        }

        // Ha nincs categories, de vannak items, deriváljuk
        if (Array.isArray((json as any)?.items) && (json as any).items.length > 0) {
          const items = (json as any).items as any[];
          const derived = items.reduce((acc: Record<string, LocalRawCategory>, it: any) => {
            const cat = normalizeCategory(it.category) ?? "__NULL__";
            if (!acc[cat]) {
              acc[cat] = {
                category: cat === "__NULL__" ? null : cat,
                trendScore: 0,
                articleCount: 0,
                sourceDiversity: 0,
                lastArticleAt: it.timeAgo ?? null,
              };
            }
            acc[cat].articleCount += 1;
            acc[cat].sourceDiversity =
              (Number(acc[cat].sourceDiversity || 0) || 0) + (Number(it.sources || 0) || 0);
            if (it.timeAgo && (!acc[cat].lastArticleAt || it.timeAgo > acc[cat].lastArticleAt)) {
              acc[cat].lastArticleAt = it.timeAgo;
            }
            return acc;
          }, {});
          const values = Object.values(derived).filter((v): v is LocalRawCategory => {
            return isRawCategory(v) && normalizeCategory(v.category) !== null;
          }) as LocalRawCategory[];
          if (mounted.current) setCategoryTrends(values);
          return;
        }

        if (mounted.current) setCategoryTrends([]);
      } catch (e) {
        if (mounted.current) setCategoryTrends([]);
      } finally {
        if (mounted.current) setLoading(false);
      }
    }
    load();
    return () => {
      mounted.current = false;
    };
  }, [period, sort]); // újrafetch, ha period vagy sort változik

  // UI items
  const categoryItems = categoryTrends
    .filter((c) => normalizeCategory(c.category) !== null)
    .map((c) => {
      const cat = normalizeCategory(c.category)!;
      return {
        id: `cat-${cat}`,
        title: cat,
        score: Number(c.trendScore || 0),
        sources: Number(c.articleCount || 0),
        dominantSource: `${c.sourceDiversity ?? 0} forrás`,
        timeAgo: c.lastArticleAt ? new Date(c.lastArticleAt).toLocaleString() : "",
        href: `/insights/category/${encodeURIComponent(cat)}`,
      };
    });

  return (
    <main className="container py-4">
      {/* ThemeSync: szinkronizálja a Zustand theme értékét a DOM data-theme attribútumával */}
      <ThemeSync />

      <header className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between mb-3 gap-3">
        <div>
          <h1 className="h3 mb-1 text-center text-md-start">Trendek</h1>
          <p className="text-muted mb-0">Kategória trendek és források áttekintése</p>
        </div>

        <div className="d-flex gap-2 align-items-center">
          {/* Period gombcsoport (7d/30d/90d) */}
          <div className="btn-group me-2" role="group" aria-label="Időszak">
            <button
              type="button"
              className={`btn btn-outline-secondary ${period === "7d" ? "active" : ""}`}
              onClick={() => setPeriod("7d")}
            >
              7d
            </button>
            <button
              type="button"
              className={`btn btn-outline-secondary ${period === "30d" ? "active" : ""}`}
              onClick={() => setPeriod("30d")}
            >
              30d
            </button>
            <button
              type="button"
              className={`btn btn-outline-secondary ${period === "90d" ? "active" : ""}`}
              onClick={() => setPeriod("90d")}
            >
              90d
            </button>
          </div>

          {/* A meglévő InsightFilters komponens: active/onChange API */}
          <InsightFilters active={sort} onChange={(f) => setSort(f)} />
        </div>
      </header>

      <section aria-labelledby="category-trends">
        <h2 id="category-trends" className="fs-5 fw-bold mb-2 visually-hidden">Kategória trendek</h2>

        <div className="row g-3">
          <InsightList items={categoryItems} loading={loading} />
        </div>
      </section>
    </main>
  );
}
