"use client";
import "@/styles/insights.css";
import { useMemo, useState, useRef, useEffect } from "react";
import InsightCard from "@/components/InsightCard";
import InsightFilters from "@/components/InsightFilters";
import ThemeSync from "@/components/ThemeSync";
import { useInsights } from "@/hooks/useInsights";
import { useTimeseriesAll } from "@/hooks/useTimeseriesAll";
import dynamic from "next/dynamic";
import useSWR from "swr";
import ForecastStatus from "@/components/ForecastStatus";
import WhatHappenedToday from "@/components/WhatHappenedToday";
import { useUserStore } from "@/store/useUserStore";

// ⭐ Forecast API hook
const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_UTOM_API_KEY!,
    },
  }).then((r) => r.json());

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
  const theme = useUserStore((s) => s.theme);
  const user = useUserStore((s) => s.user);
  const isPremium = user?.is_premium === true;
  const userLoading = useUserStore((s) => s.loading);

  // Amíg tölt a user → ne mutass semmit
  if (userLoading) {
    return null; // vagy loader
  }

  // Ha betöltött és nem prémium → modal
  if (!isPremium) {
    return <PremiumRequiredModal />;
  }

  // ⭐ Ha prémium → mehet az eredeti Insights oldal
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const [period, setPeriod] = useState<"24h" | "7d" | "30d" | "90d">("24h");
  const [sort, setSort] = useState<string>("Legfrissebb");

  const { data, error, loading } = useInsights(period, sort);
  const { data: tsData, loading: tsLoading } = useTimeseriesAll(period);

  const { data: forecastData } = useForecast();

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };

    const onMouseLeave = () => { isDown = false; };
    const onMouseUp = () => { isDown = false; };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5;
      el.scrollLeft = scrollLeft - walk;
    };

    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mouseleave", onMouseLeave);
    el.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mousemove", onMouseMove);

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mouseleave", onMouseLeave);
      el.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  const downsampledTs = useMemo(() => {
    if (!tsData?.categories) return [];
    return tsData.categories;
  }, [tsData]);

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
    <main className="container-fluid py-4">
      <ThemeSync />

      {/* HEADER */}
      <header className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between mb-3 gap-3">
        <div>
          <h1 className="h3 mb-1 text-center text-md-start">Insights</h1>
          <p className="text-muted mb-0">Kategória trendek és forráseloszlások</p>
        </div>

        <div className="d-flex gap-2 align-items-center">
          <div className="insights-filter-group me-2">
            <button type="button" className={`insights-filter-btn ${period === "24h" ? "active" : ""}`} onClick={() => setPeriod("24h")}>24h</button>
            <button type="button" className={`insights-filter-btn ${period === "7d" ? "active" : ""}`} onClick={() => setPeriod("7d")}>7d</button>
            <button type="button" className={`insights-filter-btn ${period === "30d" ? "active" : ""}`} onClick={() => setPeriod("30d")}>30d</button>
            <button type="button" className={`insights-filter-btn ${period === "90d" ? "active" : ""}`} onClick={() => setPeriod("90d")}>90d</button>
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
            data={downsampledTs || []}
            forecast={forecastData?.forecast || {}}
            range={period}
          />
          <ForecastStatus />
        </div>
      )}

      {/* KATEGÓRIAKÁRTYÁK */}
      <section aria-labelledby="category-trends">
        <h2 id="category-trends" className="fs-5 fw-bold mb-2">
          Kategória trendek
        </h2>

        <div className="insight-feed-wrapper p-3 rounded-4">
          <div className="insight-horizontal-scroll" ref={scrollRef}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={`skeleton-${i}`} className="insight-card-wrapper">
                    <InsightCard
                      title="Betöltés..."
                      score={0}
                      sources={0}
                      dominantSource=""
                      timeAgo=""
                      href="#"
                      ringSources={[]}
                      sparkline={[]}/>
                  </div>
                ))
              : categoryItems.map((item) => (
                  <div key={item.id} className="insight-card-wrapper">
                    <InsightCard {...item}/>
                  </div>
                ))}
          </div>
        </div>
      </section>

      <div className="container-fluid mt-5 px-0">
        <WhatHappenedToday />
      </div>
    </main>
  );
}

/* ⭐ Prémium modal (ugyanaz, mint a Híradóban) */
function PremiumRequiredModal() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1055,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "2rem",
          width: "100%",
          maxWidth: "680px",
          padding: "2.8rem",
          borderRadius: "24px",
          background: "#1d2e4a",
          color: "#fff",
        }}
      >
        <div style={{ flex: "0 0 180px" }}>
          <img
            src="/icons/premium.png"
            alt="Prémium szükséges"
            style={{
              width: "100%",
              height: "auto",
              borderRadius: "16px",
            }}
          />
        </div>

        <div style={{ flex: 1, textAlign: "center" }}>
          <h2 style={{ fontWeight: 700, fontSize: "1.4rem" }}>
            Prémium tartalom
          </h2>

          <p style={{ fontSize: "0.95rem", color: "#e0e0e0" }}>
            Az Insights oldal csak{" "}
            <span style={{ color: "#ffb4b4", fontWeight: 600 }}>
              Prémium előfizetéssel
            </span>{" "}
            érhető el.
          </p>

          <button
            className="btn w-100"
            onClick={() => (window.location.href = "/premium")}
            style={{
              background: "linear-gradient(135deg, #ffb4b4, #ffdddd)",
              borderRadius: "999px",
              padding: "0.75rem 1.2rem",
              fontWeight: 700,
              color: "#111",
            }}
          >
            Prémium feloldása
          </button>

          <button
            className="btn btn-link"
            style={{
              color: "#ccc",
              fontSize: "0.8rem",
            }}
            onClick={() => (window.location.href = "/")}
          >
            Vissza a főoldalra
          </button>
        </div>
      </div>
    </div>
  );
}
