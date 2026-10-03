"use client";

import { useEffect, useState, useRef } from "react";
import type { Filters } from "./TrendsFilters";
import SparklineMini from "./SparklineMini";
import SparklineDetailed from "./SparklineDetailed";
import SpikeBadge from "./SpikeBadge";
import { Modal, Button } from "react-bootstrap";
import TrendSourcesModal from "./TrendSourcesModal";

type HistoryRow = { day: string; freq: number };

function normalizeHistoryRows(value: unknown): HistoryRow[] {
  const rows = Array.isArray(value) ? value : [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const raw = row as { day?: unknown; hour?: unknown; freq?: unknown };
    const freq = Number(raw.freq);
    if (!Number.isFinite(freq) || freq < 0) return [];
    const day = typeof raw.day === "string" && !Number.isNaN(new Date(raw.day).getTime())
      ? raw.day
      : "";
    const hour = Number(raw.hour);
    if (!day && (!Number.isInteger(hour) || hour < 0 || hour > 23)) return [];
    return [{ day, freq }];
  });
}

interface Article { id: number; url: string; content: string; source: string; }

interface Trend {
  keyword: string;
  frequency: number;
  growth?: number | null;
  first_seen?: string;
  last_seen?: string;
  articles?: Article[];
  status?: "new" | "recurring" | "decreasing" | "stable" | "periodic" | "international";
  category?: string;
  history?: HistoryRow[];
}

interface Source {
  title: string;
  url: string;
  source: string;
  date: string;
  summary?: string;
}

export default function TrendsPanel({ filters }: { filters: Filters }) {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [historyMap, setHistoryMap] = useState<Record<string, HistoryRow[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showChart, setShowChart] = useState<string | null>(null);

  // Load more / visible count
  const MAX_VISIBLE = 50;
  const [visibleCount, setVisibleCount] = useState<number>(MAX_VISIBLE);

  // reset visibleCount when simple UI filters change (keyword, categories, sort)
  const simpleFilterKey = `${filters.keyword || ""}|${(filters.categories || []).join(",")}|${filters.sort || ""}`;
  useEffect(() => {
    setVisibleCount(MAX_VISIBLE);
  }, [simpleFilterKey]);

  // ref alapú cache és cache key nyomonkövetés
  const historyCache = useRef<Record<string, HistoryRow[]>>({});
  const lastCacheKey = useRef<string>("");

  function makeCacheKey() {
    return [
      filters.period || "",
      (filters.sources || []).join(","),
      filters.startDate || "",
      filters.endDate || ""
    ].join("|");
  }

  // 1) Fetch trends list (nem per-key history)
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(false);

    // cache invalidation: csak ha tényleg változott a period/sources/start/end
    const currentKey = makeCacheKey();
    if (lastCacheKey.current !== currentKey) {
      historyCache.current = {};           // ürítjük a ref cache-t
      setHistoryMap({});                   // ürítjük a UI állapotot is
      lastCacheKey.current = currentKey;
      // reset visibleCount to initial when major filters change
      setVisibleCount(MAX_VISIBLE);
    }

    const qs = new URLSearchParams();
    if (filters.period) qs.set("period", filters.period);
    if (filters.sources?.length) qs.set("sources", filters.sources.join(","));
    if (filters.categories?.length) qs.set("categories", filters.categories.join(","));
    if (filters.startDate) qs.set("startDate", filters.startDate);
    if (filters.endDate) qs.set("endDate", filters.endDate);
    if (filters.keyword) qs.set("keyword", filters.keyword);
    if (filters.sort) qs.set("sort", filters.sort);

    const trendsUrl = `/api/trends?${qs.toString()}`;

    fetch(trendsUrl, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        const sourceArray: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data.trends)
          ? data.trends
          : Array.isArray(data.rows)
          ? data.rows
          : [];

        const mapped: Trend[] = sourceArray.map((r: any) => ({
          keyword: (r.keyword ?? r.topic ?? r.name ?? "").toString().trim(),
          frequency: (() => {
            const rawFrequency = r.freq ?? r.totalCount ?? r.frequency;
            const numericFrequency = Number(rawFrequency);
            return Number.isFinite(numericFrequency) && numericFrequency >= 0
              ? numericFrequency
              : 0;
          })(),
          category: r.category ?? undefined,
          growth: typeof r.growth === "number" ? r.growth : null,
          first_seen: r.first_seen ?? undefined,
          last_seen: r.last_seen ?? undefined,
          articles: Array.isArray(r.articles) ? r.articles : undefined,
          status: r.status ?? undefined,
          history: normalizeHistoryRows(r.history),
        })).filter((trend) => trend.keyword.trim().length > 0);

        setTrends(mapped);
      })
      .catch(() => {
        if (mounted) {
          setError(true);
          setTrends([]);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  // szűkített dependency lista: csak azok a filter mezők, amelyek a history-t befolyásolják
  }, [filters.period, filters.sources, filters.categories, filters.startDate, filters.endDate, filters.keyword, filters.sort]);

  // 2) Fetch per-key history csak a jelenleg megjelenített (visibleCount) elemekhez
  useEffect(() => {
    let mounted = true;

    // build visibleForHistory from current trends + filters (same logic as render)
    const visibleForHistory = trends
      .filter((t) => {
        const matchKeyword =
          !filters.keyword || filters.keyword.trim().length === 0
            ? true
            : t.keyword.toLowerCase().includes(filters.keyword.trim().toLowerCase());

        const matchCategory =
          !(filters.categories && filters.categories.length)
            ? true
            : t.category
            ? filters.categories.filter((c): c is string => typeof c === "string").map((c) => c.trim().toLowerCase()).includes(t.category.trim().toLowerCase())
            : false;

        return matchKeyword && matchCategory;
      })
      .slice(0, visibleCount);

    if (visibleForHistory.length === 0) return;

    visibleForHistory.forEach((t) => {
      // ha a ref cache-ben van, ne kérj újra; ha state-ben még nincs, töltsd be onnan
      if (historyCache.current[t.keyword]) {
        setHistoryMap((prev) => (prev[t.keyword] ? prev : { ...prev, [t.keyword]: historyCache.current[t.keyword] }));
        return;
      }

      if (Array.isArray(t.history) && t.history.length > 0) {
        historyCache.current[t.keyword] = t.history as HistoryRow[];
        setHistoryMap((prev) => ({ ...prev, [t.keyword]: t.history as HistoryRow[] }));
        return;
      }

      const hq = new URLSearchParams({
        keyword: t.keyword,
        period: filters.period,
        startDate: filters.startDate || "",
        endDate: filters.endDate || "",
        sources: (filters.sources || []).join(","),
      });

      fetch(`/api/trend-history?${hq.toString()}`, { cache: "no-store" })
        .then((res) => {
          if (!res.ok) throw new Error(String(res.status));
          return res.json();
        })
        .then((hist) => {
          if (!mounted) return;
          const arr = normalizeHistoryRows(Array.isArray(hist.history) ? hist.history : hist);
          if (arr.length) {
            historyCache.current[t.keyword] = arr;
            setHistoryMap((prev) => ({ ...prev, [t.keyword]: arr }));
          }
        })
        .catch(() => {
          // ignore per-key fetch errors, leave history absent
        });
    });

    return () => {
      mounted = false;
    };
  }, [trends, filters.period, filters.sources, filters.startDate, filters.endDate, filters.categories, filters.keyword, visibleCount]);

  function calcGrowth(history: HistoryRow[]): number {
    if (!history || history.length < 2) return 0;
    const first = history[0].freq;
    const last = history[history.length - 1].freq;
    if (first === 0) return 0;
    return (last - first) / first; // arány
  }

  function filterByCustomPeriod(history: HistoryRow[]) {
    if (!filters.startDate || !filters.endDate) return history;
    return history.filter((h) => {
      const day = typeof h.day === "string" ? h.day.slice(0, 10) : "";
      return /^\d{4}-\d{2}-\d{2}$/.test(day) &&
        day >= filters.startDate! && day <= filters.endDate!;
    });
  }

  function getDisplayHistory(keyword: string): HistoryRow[] {
    const base = historyMap[keyword] ?? [];
    if (filters.period === "custom") return filterByCustomPeriod(base);
    return base;
  }

  function isIncreasing(history: HistoryRow[]): boolean {
    if (!history || history.length < 2) return false;
    const last = history[history.length - 1].freq;
    const prev = history[history.length - 2].freq;
    return last > prev;
  }

  function isDecreasing(history: HistoryRow[]): boolean {
    if (!history || history.length < 2) return false;
    const last = history[history.length - 1].freq;
    const prev = history[history.length - 2].freq;
    return last < prev;
  }

  const [sources, setSources] = useState<Source[]>([]);
  const [activeSourcesKeyword, setActiveSourcesKeyword] = useState<string | null>(null);
  const sourcesRequestRef = useRef(0);

  function handleShowSources(keyword: string, period: string = filters.period) {
    const requestId = ++sourcesRequestRef.current;
    setActiveSourcesKeyword(keyword);
    // Do not keep the previous keyword's articles visible while this request
    // is in flight. Otherwise a slow response can make the modal look as if
    // the new keyword has already loaded the old result set.
    setSources([]);

    fetch(`/api/trends/trend-sources?keyword=${encodeURIComponent(keyword)}&period=${encodeURIComponent(period)}`)
      .then(res => {
        if (!res.ok) throw new Error(`trend_sources_${res.status}`);
        return res.json();
      })
      .then((data: unknown) => {
        if (requestId !== sourcesRequestRef.current) return;
        setSources(Array.isArray(data) ? data as Source[] : []);
      })
      .catch(err => {
        if (requestId !== sourcesRequestRef.current) return;
        console.error("Források betöltése sikertelen:", err);
        setSources([]);
      });
  }

  // visibleTrends a renderhez (limitálva visibleCount-tal)
  const filteredTrends = trends.filter((t) => {
    const matchKeyword =
      !filters.keyword || filters.keyword.trim().length === 0
        ? true
        : t.keyword.toLowerCase().includes(filters.keyword.trim().toLowerCase());

    const matchCategory =
      !(filters.categories && filters.categories.length)
        ? true
        : t.category
        ? filters.categories.filter((c): c is string => typeof c === "string").map((c) => c.trim().toLowerCase()).includes(t.category.trim().toLowerCase())
        : false;

    return matchKeyword && matchCategory;
  });

  const visibleTrends = filteredTrends.slice(0, visibleCount);

  if (loading) return <p className="text-muted">Betöltés folyamatban…</p>;
  if (error) return <p className="text-danger">Hiba történt a trendek betöltésekor.</p>;
  if (visibleTrends.length === 0) return <p className="text-muted">Nincs találat a megadott szűrőkre.</p>;

  return (
    <>
      <ul className="list-group mb-4">
        {visibleTrends.map((t, idx) => {
          const displayHistory = getDisplayHistory(t.keyword);
          const hasHistory = displayHistory.length > 0;

          return (
            <li key={`${t.keyword}-${t.category ?? "nc"}-${idx}`} className="list-group-item">
              <div className="d-flex flex-column">
                <div className="d-flex justify-content-between align-items-center" style={{ width: "100%" }}>
                  <span className="fw-bold fs-5">{t.keyword}</span>

                  {hasHistory && (
                    <div style={{ position: "relative", display: "inline-block", width: 160, height: 40 }}>
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          pointerEvents: "none",
                        }}
                      >
                        <SparklineMini history={displayHistory} period={filters.period} />
                      </div>

                      <div
                        role="button"
                        aria-label="Részletes grafikon megnyitása"
                        tabIndex={0}
                        onClick={() => setShowChart(t.keyword)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setShowChart(t.keyword);
                          }
                        }}
                        title="Kattints a részletes grafikonhoz"
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          width: 160,
                          height: 40,
                          cursor: "pointer",
                          background: "transparent",
                          borderRadius: 6,
                          zIndex: 10,
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
                  <button
                    className="btn btn-sm btn-outline-primary me-2"
                    onClick={() => {
                      setActiveSourcesKeyword(t.keyword);
                      handleShowSources(t.keyword, filters.period);
                    }}
                  >
                    Cikkek
                  </button>
                  <TrendSourcesModal
                    show={activeSourcesKeyword === t.keyword}
                    onHide={() => setActiveSourcesKeyword(null)}
                    keyword={t.keyword}
                    sources={sources}
                    defaultPeriod={filters.period}
                    onPeriodChange={handleShowSources}
                  />

                  <span className="badge bg-info">{t.frequency}×</span>

                  {displayHistory.length === 1 && <span className="badge bg-success">Új</span>}

                  {isIncreasing(displayHistory) && <span className="badge bg-primary">Növekvő</span>}

                  {isDecreasing(displayHistory) && <span className="badge bg-warning text-dark">Csökkenő</span>}

                  {(t.growth ?? 0) === 0 && t.frequency > 5 && <span className="badge bg-secondary">Stabil</span>}

                  {filters.period === "custom" && <span className="badge bg-dark">Időszakos</span>}

                  {t.keyword.match(/ország|nemzetközi|EU|világ/i) && <span className="badge bg-info">Nemzetközi</span>}

                  <SpikeBadge
                    growth={calcGrowth(displayHistory)}
                    period={filters.period}
                    topic={t.keyword}
                    totalCount={t.frequency}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {filteredTrends.length > visibleCount && (
        <div className="text-center mt-3">
          <button
            className="btn btn-outline-primary"
            onClick={() => setVisibleCount((c) => c + MAX_VISIBLE)}
          >
            Továbbiak betöltése
          </button>
        </div>
      )}

      <Modal show={!!showChart} onHide={() => setShowChart(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{showChart} – Részletes trend</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {showChart && getDisplayHistory(showChart).length === 0 ? (
            <p className="text-muted">Betöltés folyamatban…</p>
          ) : (
            showChart && (
              <div style={{ width: "100%", height: "400px" }}>
                <SparklineDetailed
                  key={`${showChart}-${filters.period}-${filters.startDate || ""}-${filters.endDate || ""}`}
                  history={getDisplayHistory(showChart)}
                  period={filters.period}
                  startDate={filters.startDate}
                  endDate={filters.endDate}
                />
              </div>
            )
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowChart(null)} style={{ color: "#fff", fontWeight: 600 }}>
            Bezárás
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
