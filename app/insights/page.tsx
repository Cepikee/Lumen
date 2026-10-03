"use client";
import "@/styles/insights.css";
import { useMemo, useState, useRef, useEffect } from "react";
import InsightCard from "@/components/InsightCard";
import InsightFilters from "@/components/InsightFilters";
import ThemeSync from "@/components/ThemeSync";
import { useInsights } from "@/hooks/useInsights";
import { useTimeseriesAll } from "@/hooks/useTimeseriesAll";
import dynamic from "next/dynamic";
import ForecastStatus from "@/components/ForecastStatus";
import WhatHappenedToday from "@/components/WhatHappenedToday";
import { useUserStore } from "@/store/useUserStore";
import WSourceOsszehasonlitas from "@/components/WSourceOsszehasonlitas";
import { useForecast } from "@/hooks/useForecast";
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

function formatInsightDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function finiteInsightNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function InsightFeedPage() {
  // -------------------------
  // STORE / THEME / USER
  // -------------------------
  const theme = useUserStore((s) => s.theme);
  const user = useUserStore((s) => s.user);
  const userLoading = useUserStore((s) => s.loading);

  useEffect(() => {
    useUserStore.getState().loadUser?.();
  }, []);

  // -------------------------
  // PRÉMIUM ELLENŐRZÉS (típusbiztos, runtime)
  // -------------------------
  const isPremium = user?.isPremium === true;

  // -------------------------
  // UI STATE / DATA HOOKS (egyszer, a komponens elején)
  // -------------------------
  const [period, setPeriod] = useState<"24h" | "7d" | "30d" | "90d">("24h");
  const [sort, setSort] = useState<string>("Legfrissebb");

  const { data, error, loading } = useInsights(period, sort);
  const { data: tsData, error: tsError, loading: tsLoading } = useTimeseriesAll(period);
  const { data: forecastData } = useForecast();

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // scrollRef effect (declared unconditionally)
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

    const onMouseLeave = () => {
      isDown = false;
    };

    const onMouseUp = () => {
      isDown = false;
    };

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
  }, [scrollRef]);

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
      .map((it: any) => {
        const cat = (it.category ?? null) as string | null;
        return {
          category: cat,
          trendScore: finiteInsightNumber(it.trendScore),
          articleCount: Math.max(0, finiteInsightNumber(it.articleCount)),
          sourceDiversity: Math.max(0, finiteInsightNumber(it.sourceDiversity)),
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
      timeAgo: formatInsightDate(c.lastArticleAt),
      href: `/insights/category/${encodeURIComponent(cat)}`,
      ringSources: c.ringSources,
      sparkline: c.sparkline,
    };
  });

  // -------------------------
  // MINDEN HOOK fent van — most jöhet a feltételes render
  // -------------------------
  if (userLoading) return null;

  if (!isPremium) {
    return (
      <>
        <PremiumRequiredModal />
      </>
    );
  }

  // -------------------------
  // RENDER
  // -------------------------
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

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
      ) : tsError ? (
        <div role="alert" className="mb-4 alert alert-danger">
          Az idősor adatai nem tölthetők be.
        </div>
      ) : (
        <div className="mb-4 p-3 rounded-4 bg-body-secondary">
          <InsightsOverviewChart data={downsampledTs || []} forecast={forecastData?.forecast || {}} range={period} />
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
                    <InsightCard title="Betöltés..." score={0} sources={0} dominantSource="" timeAgo="" href="#" ringSources={[]} sparkline={[]} />
                  </div>
                ))
              : error ? (
                <div role="alert" className="alert alert-danger mb-0">
                  Az Insights adatai nem tölthetők be.
                </div>
              ) : categoryItems.map((item) => (
                  <div key={item.id} className="insight-card-wrapper">
                    <InsightCard {...item} />
                  </div>
                ))}
          </div>
        </div>
      </section>

      <div className="container-fluid mt-5 px-0">
        <WhatHappenedToday />
      </div>
      <div className="w-full flex flex-col gap-8">
      <WSourceOsszehasonlitas />
    </div>
    </main>
  );
}




/* ⭐ Prémium modal */
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
          <h2 style={{ fontWeight: 700, fontSize: "1.4rem" }}>Prémium tartalom</h2>

          <p style={{ fontSize: "0.95rem", color: "#e0e0e0" }}>
            Az Insights oldal csak{" "}
            <span style={{ color: "#0400ff", fontWeight: 600 }}>Prémium előfizetéssel</span> érhető el.
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

/* Prémium belerakva */
