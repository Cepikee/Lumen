"use client";
import "@/styles/insights.css";
import { useMemo, useState } from "react";
import InsightCard from "@/components/InsightCard";
import InsightFilters from "@/components/InsightFilters";
import ThemeSync from "@/components/ThemeSync";
import { useInsights } from "@/hooks/useInsights";
import { useTimeseriesAll } from "@/hooks/useTimeseriesAll";
import dynamic from "next/dynamic";
import useSWR from "swr";
import ForecastStatus from "@/components/ForecastStatus";

// ⭐ Forecast API hook
const fetcher = (url: string) => fetch(url).then((r) => r.json());
const useForecast = () => useSWR("/api/insights/forecast", fetcher);

const InsightsOverviewChart = dynamic(
  () => import("@/components/InsightsOverviewChart"),
  { ssr: false }
);

type LocalRawCategory = {
  category: string | null;
  trendScore: number;
  articleCount: number;
  sourceDiversity?: number;
  lastArticleAt?: string | null;
  sparkline?: number[];
  ringSources?: any[];
};

function normalizeCategory(raw?: string | null) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (s.toLowerCase() === "null") return null;
  return s;
}

export default function InsightFeedPage() {
  const [period, setPeriod] = useState<"24h" | "7d" | "30d" | "90d">("24h");
  const [sort, setSort] = useState<string>("Legfrissebb");

  const { data, error, loading } = useInsights(period, sort);
  const { data: tsData, loading: tsLoading } = useTimeseriesAll(period);

  // ⭐ Forecast betöltése
  const { data: forecastData } = useForecast();

  const categoryTrends = useMemo<LocalRawCategory[]>(() => {
    if (!data) return [];

    const sourceArray =
      Array.isArray(data.categories) && data.categories.length > 0
        ? data.categories
        : [];

    const mapped = sourceArray
      .map((it) => {
        const cat = (it.category ?? null) as string | null;
        return {
          category: cat,
          trendScore: Number(it.trendScore ?? 0),
          articleCount: Number(it.articleCount ?? 0),
          sourceDiversity: Number(it.sourceDiversity ?? 0),
          lastArticleAt: it.lastArticleAt ?? null,
          sparkline: it.sparkline ?? [],
          ringSources: it.ringSources ?? [],
        } as LocalRawCategory;
      })
      .filter((c) => normalizeCategory(c.category) !== null);

    return mapped;
  }, [data]);

  const categoryItems = categoryTrends.map((c) => {
    const cat = normalizeCategory(c.category)!;
    return {
      id: `cat-${cat}`,
      title: cat,
      score: Number(c.trendScore || 0),
      sources: Number(c.articleCount || 0),
      dominantSource: `${c.sourceDiversity ?? 0} forrás`,
      timeAgo: c.lastArticleAt ? new Date(c.lastArticleAt).toLocaleString() : "",
      href: `/insights/category/${encodeURIComponent(cat)}`,
      ringSources: c.ringSources,
      sparkline: c.sparkline,
    };
  });

  return (
    <main className="container py-4">
      <ThemeSync />

      {/* HEADER */}
      <header className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between mb-3 gap-3">
        <div>
          <h1 className="h3 mb-1 text-center text-md-start">Insights</h1>
          <p className="text-muted mb-0">Kategória trendek és forráseloszlások</p>
        </div>

        <div className="d-flex gap-2 align-items-center">
          <div className="insights-filter-group me-2">
  <button
    type="button"
    className={`insights-filter-btn ${period === "24h" ? "active" : ""}`}
    onClick={() => setPeriod("24h")}
  >
    24h
  </button>

  <button
    type="button"
    className={`insights-filter-btn ${period === "7d" ? "active" : ""}`}
    onClick={() => setPeriod("7d")}
  >
    7d
  </button>

  <button
    type="button"
    className={`insights-filter-btn ${period === "30d" ? "active" : ""}`}
    onClick={() => setPeriod("30d")}
  >
    30d
  </button>

  <button
    type="button"
    className={`insights-filter-btn ${period === "90d" ? "active" : ""}`}
    onClick={() => setPeriod("90d")}
  >
    90d
  </button>
</div>


          <InsightFilters active={sort} onChange={(f) => setSort(f)} />
        </div>
      </header>

      {/* GRAFIKON */}
      {tsLoading ? (
        <div style={{ height: 220 }} className="mb-4 bg-light rounded-4" />
      ) : (
        <div className="mb-4 p-3 rounded-4 bg-body-secondary">
          <InsightsOverviewChart
            data={tsData?.categories || []}
            forecast={forecastData?.forecast || {}}
            range={period}
          />
             <ForecastStatus />
        </div>
        
      )}

   
      {/* KATEGÓRIAKÁRTYÁK */}
      <section aria-labelledby="category-trends">
        <h2 id="category-trends" className="fs-5 fw-bold mb-2 visually-hidden">
          Kategória trendek
        </h2>

        <div className="insight-feed-wrapper p-3 rounded-4">
          <div className="row g-3">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={`skeleton-${i}`} className="col-12 col-md-6 col-lg-4">
                    <InsightCard
                      title="Betöltés..."
                      score={0}
                      sources={0}
                      dominantSource=""
                      timeAgo=""
                      href="#"
                      ringSources={[]}
                      sparkline={[]}
                    />
                  </div>
                ))
              : categoryItems.map((item) => (
                  <div key={item.id} className="col-12 col-md-6 col-lg-4">
                    <InsightCard {...item} />
                  </div>
                ))}
          </div>

        </div>
      </section>
    </main>
  );
}
