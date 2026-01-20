// app/insights/page.tsx
"use client";

import { useMemo, useState } from "react";
import InsightList from "@/components/InsightList";
import InsightFilters from "@/components/InsightFilters";
import ThemeSync from "@/components/ThemeSync";
import { useInsights, InsightApiItem } from "@/hooks/useInsights";

type LocalRawCategory = {
  category: string | null;
  trendScore: number;
  articleCount: number;
  sourceDiversity?: number | string;
  lastArticleAt?: string | null;
  // opcionális vizualizációs adatok (ha a backend küldi)
  sparkline?: number[];
  ringData?: number[];
};

function normalizeCategory(raw?: string | null) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (s.toLowerCase() === "null") return null;
  return s;
}

/** Type guard egyszerű ellenőrzéshez (megtartva) */
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
  // period: időablak (7d/30d/90d)
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");
  // sort: a meglévő InsightFilters komponens által használt aktív filter string
  const [sort, setSort] = useState<string>("Legfrissebb");

  // SWR hook: data | error | loading
  const { data, error, loading } = useInsights(period, sort);

  // Deriváljuk a categoryTrends tömböt a hookból érkező adatokból
  const categoryTrends = useMemo<LocalRawCategory[]>(() => {
    if (!data) return [];

    const sourceArray = Array.isArray(data.categories) && data.categories.length > 0
      ? data.categories
      : Array.isArray(data.items) ? data.items : [];

    const mapped = sourceArray
      .map((it) => {
        const cat = (it.category ?? null) as string | null;
        return {
          category: cat,
          trendScore: Number(it.trendScore ?? 0),
          articleCount: Number(it.articleCount ?? 0),
          sourceDiversity: it.sourceDiversity ?? 0,
          lastArticleAt: it.lastArticleAt ?? null,
          sparkline: it.sparkline,
          ringData: it.ringData,
        } as LocalRawCategory;
      })
      .filter((c) => normalizeCategory(c.category) !== null);

    return mapped;
  }, [data]);

  // UI items: átadjuk a sparkline/ringData mezőket is, ha vannak
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
        // átadjuk a vizualizációs adatokat az InsightList/InsightCard számára
        ringData: c.ringData,
        sparkline: c.sparkline,
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
