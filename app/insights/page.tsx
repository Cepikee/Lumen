"use client";
import "@/styles/insights.css";
import { useMemo, useState } from "react";
import InsightCard from "@/components/InsightCard";
import InsightFilters from "@/components/InsightFilters";
import ThemeSync from "@/components/ThemeSync";
import { useInsights } from "@/hooks/useInsights";

type LocalRawCategory = {
  category: string | null;
  trendScore: number;
  articleCount: number;
  sourceDiversity?: number | string;
  lastArticleAt?: string | null;
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

export default function InsightFeedPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");
  const [sort, setSort] = useState<string>("Legfrissebb");

  const { data, error, loading } = useInsights(period, sort);

  const categoryTrends = useMemo<LocalRawCategory[]>(() => {
    if (!data) return [];

    const sourceArray =
      Array.isArray(data.categories) && data.categories.length > 0
        ? data.categories
        : Array.isArray(data.items)
        ? data.items
        : [];

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
        ringData: c.ringData,
        sparkline: c.sparkline,
      };
    });

  return (
    <main className="container py-4">
      <ThemeSync />

      <header className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between mb-3 gap-3">
        <div>
          <h1 className="h3 mb-1 text-center text-md-start">Trendek</h1>
          <p className="text-muted mb-0">Kategória trendek és források áttekintése</p>
        </div>

        <div className="d-flex gap-2 align-items-center">
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

          <InsightFilters active={sort} onChange={(f) => setSort(f)} />
        </div>
      </header>

      <section aria-labelledby="category-trends">
  <h2 id="category-trends" className="fs-5 fw-bold mb-2 visually-hidden">
    Kategória trendek
  </h2>

  {/* FEED KERET + SZOROSABB KÁRTYÁK */}
  <div className="insight-feed-wrapper p-3 rounded-4">
    <div className="row g-2">
      {loading
        ? Array.from({ length: 6 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="col-12 d-flex">
              <article
                className="insight-card card border-0"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: "1 1 auto",
                  minHeight: 140,
                }}
              >
                <div
                  className="card-body d-flex flex-column gap-3"
                  style={{ display: "flex", flexDirection: "column", flex: 1 }}
                >
                  <div className="d-flex align-items-start">
                    <div
                      className="me-3 d-flex align-items-center"
                      style={{ width: 64, height: 64, minWidth: 64 }}
                    >
                      <div className="insight-source-ring bg-secondary rounded-circle w-100 h-100" />
                    </div>
                    <div className="flex-grow-1">
                      <div
                        style={{
                          height: 18,
                          width: "60%",
                          background: "rgba(0,0,0,0.06)",
                          borderRadius: 6,
                          marginBottom: 8,
                        }}
                      />
                      <div
                        style={{
                          height: 12,
                          width: "40%",
                          background: "rgba(0,0,0,0.04)",
                          borderRadius: 6,
                        }}
                      />
                    </div>
                    <div className="ms-2 text-end d-flex flex-column gap-2">
                      <div
                        style={{
                          height: 28,
                          width: 64,
                          background: "rgba(0,0,0,0.04)",
                          borderRadius: 6,
                        }}
                      />
                    </div>
                  </div>

                  <div
                    className="card-footer bg-transparent border-0 pt-0"
                    style={{ marginTop: "auto" }}
                  >
                    <div
                      className="insight-sparkline"
                      style={{ height: 40, background: "rgba(0,0,0,0.03)" }}
                    />
                  </div>
                </div>
              </article>
            </div>
          ))
        : categoryItems.map((item) => (
            <div key={item.id} className="col-12 d-flex">
              <InsightCard {...item} />
            </div>
          ))}
    </div>
  </div>
</section>

    </main>
  );
}
