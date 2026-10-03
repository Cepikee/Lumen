// components/TrendsList.tsx
"use client";

import { useEffect, useState } from "react";
import SparklineMini from "./SparklineMini";
import SparklineDetailed from "./SparklineDetailed";
import SpikeBadge from "./SpikeBadge";
import { Modal, Button } from "react-bootstrap";
import { Tooltip } from "bootstrap";

interface Article { id: number; url: string; content: string; source: string; }

interface Trend {
  keyword: string;
  freq: number;
  growth?: number | null;
  first_seen?: string;
  last_seen?: string;
  articles?: Article[];
  status?: "new" | "recurring" | "decreasing" | "stable" | "periodic" | "international";
  category?: string;
}

interface Props {
  filters: {
    period: string;
    sources: string[];
    categories: string[];
    sort: string;
    keyword: string;
    startDate?: string;
    endDate?: string;
  };
  trends?: Trend[];
}

type HistoryRow = { day?: string; hour?: number; freq: number };

function normalizeHistoryRows(value: unknown): HistoryRow[] {
  const rows = Array.isArray(value) ? value : [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const raw = row as { day?: unknown; hour?: unknown; freq?: unknown };
    const freq = Number(raw.freq);
    if (!Number.isFinite(freq) || freq < 0) return [];
    const day = typeof raw.day === "string" && !Number.isNaN(new Date(raw.day).getTime())
      ? raw.day
      : undefined;
    const hour = Number(raw.hour);
    if (!day && (!Number.isInteger(hour) || hour < 0 || hour > 23)) return [];
    return [{ day, hour: Number.isInteger(hour) ? hour : undefined, freq }];
  });
}

function normalizeTrend(value: unknown): Trend | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<Trend> & { topic?: unknown; name?: unknown; frequency?: unknown };
  const keyword = typeof raw.keyword === "string"
    ? raw.keyword.trim()
    : typeof raw.topic === "string"
      ? raw.topic.trim()
      : typeof raw.name === "string"
        ? raw.name.trim()
        : "";
  if (!keyword) return null;
  const rawFreq = (raw as any).freq ?? raw.frequency;
  const freq = Number(rawFreq);
  return {
    keyword,
    freq: Number.isFinite(freq) && freq >= 0 ? freq : 0,
    growth: raw.growth == null || Number.isFinite(Number(raw.growth)) ? (raw.growth == null ? null : Number(raw.growth)) : null,
    first_seen: typeof raw.first_seen === "string" ? raw.first_seen : undefined,
    last_seen: typeof raw.last_seen === "string" ? raw.last_seen : undefined,
    articles: Array.isArray(raw.articles) ? raw.articles : undefined,
    status: raw.status,
    category: typeof raw.category === "string" && raw.category.trim() ? raw.category.trim() : undefined,
  };
}

export default function TrendsList({ filters, trends: externalTrends }: Props) {
  const [trends, setTrends] = useState<Trend[]>(
    Array.isArray(externalTrends)
      ? externalTrends.map(normalizeTrend).filter((trend): trend is Trend => trend !== null)
      : []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [historyMap, setHistoryMap] = useState<Record<string, HistoryRow[]>>({});
  const [showChart, setShowChart] = useState<string | null>(null);

  useEffect(() => {
    if (Array.isArray(externalTrends)) {
      // External trend payloads come from runtime callers and may contain
      // driver strings or malformed rows. Keep the same normalization used
      // for the initial render; otherwise the first render after prop change
      // can dereference an invalid keyword/frequency before the second effect.
      setTrends(externalTrends.map(normalizeTrend).filter((trend): trend is Trend => trend !== null));
      setHistoryMap({});
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(false);

    const query = new URLSearchParams({
      period: filters.period,
      sort: filters.sort,
      keyword: filters.keyword,
      sources: filters.sources.join(","),
      categories: filters.categories.join(","),
      startDate: filters.startDate || "",
      endDate: filters.endDate || "",
    });

    fetch(`/api/trends?${query.toString()}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`trends_http_${res.status}`);
        const data = await res.json();
        if (!data || typeof data !== "object") throw new Error("trends_invalid_response");
        return data;
      })
      .then((data) => {
        if (!mounted) return;
        const rawTrendList: unknown[] = (Array.isArray(data.trends) ? data.trends : Array.isArray(data) ? data : []) as unknown[];
        const trendList = rawTrendList
          .map(normalizeTrend)
          .filter((trend): trend is Trend => trend !== null);
        setTrends(trendList);
        setHistoryMap({});

        trendList.forEach((t: Trend) => {
          const historyQuery = new URLSearchParams({
            keyword: t.keyword,
            period: filters.period,
            startDate: filters.startDate || "",
            endDate: filters.endDate || "",
            sources: filters.sources.join(","),
          });

          fetch(`/api/trend-history?${historyQuery.toString()}`)
            .then(async (res) => {
              if (!res.ok) throw new Error(`trend_history_http_${res.status}`);
              const data = await res.json();
              if (!data || typeof data !== "object") throw new Error("trend_history_invalid_response");
              return data;
            })
            .then((data) => {
              if (!mounted) return;
              if (Array.isArray(data.history)) {
                setHistoryMap((prev) => ({ ...prev, [t.keyword]: normalizeHistoryRows(data.history) }));
              } else {
                setHistoryMap((prev) => ({ ...prev, [t.keyword]: [] }));
              }
            })
            .catch(() => {
              if (!mounted) return;
              setHistoryMap((prev) => ({ ...prev, [t.keyword]: [] }));
            });
        });
      })
      .catch(() => {
        if (mounted) setError(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [
    filters.period,
    filters.sort,
    filters.keyword,
    filters.sources,
    filters.categories,
    filters.startDate,
    filters.endDate,
    externalTrends,
  ]);

  useEffect(() => {
    if (Array.isArray(externalTrends)) {
      setTrends(externalTrends.map(normalizeTrend).filter((trend): trend is Trend => trend !== null));
    }
  }, [externalTrends]);

  useEffect(() => {
    setTimeout(() => {
      const tooltipTriggerList = Array.from(
        document.querySelectorAll('[data-bs-toggle="tooltip"]')
      );
      tooltipTriggerList.forEach((el) => {
        new Tooltip(el);
      });
    }, 50);
  }, [trends, historyMap]);

  if (loading) return <p className="text-muted">Betöltés folyamatban…</p>;
  if (error) return <p className="text-danger">Hiba történt a trendek betöltésekor.</p>;
  if (trends.length === 0) return <p className="text-muted">Nincs találat a megadott szűrőkre.</p>;

  function filterByCustomPeriod(history: HistoryRow[]) {
    if (!filters.startDate || !filters.endDate) return history;
    if (filters.period === "24h") return history;
    return history.filter((h) => {
      const day = typeof h.day === "string" ? h.day.slice(0, 10) : "";
      return /^\d{4}-\d{2}-\d{2}$/.test(day) &&
        day >= filters.startDate! && day <= filters.endDate!;
    });
  }

  function getDisplayHistory(keyword: string): HistoryRow[] {
    const base = historyMap[keyword] || [];
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

    const visibleTrends = trends.filter((t) => {
    const matchKeyword =
      filters.keyword.trim().length === 0 ||
      t.keyword.toLowerCase().includes(filters.keyword.trim().toLowerCase());

    const matchCategory =
      filters.categories.length === 0 ||
      Boolean(
        t.category &&
        filters.categories
          .map((category) => category.trim().toLowerCase())
          .includes(t.category.trim().toLowerCase())
      );

    return matchKeyword && matchCategory;
  });

  return (
    <>
      <ul className="list-group mb-4">
        {visibleTrends.map((t) => {
          const displayHistory = getDisplayHistory(t.keyword);
          const hasHistory = displayHistory.length > 0;

          const days = displayHistory.length;
          const isStable =
            days >= 5 &&
            (t.growth ?? 0) < 0.1 &&
            !isIncreasing(displayHistory) &&
            !isDecreasing(displayHistory);

          return (
            <li key={t.keyword} className="list-group-item">
              <div className="d-flex flex-column">
                <div className="d-flex justify-content-between align-items-center" style={{ width: "100%" }}>
                  <span className="fw-bold fs-5">{t.keyword}</span>

                  {hasHistory && (
                    <div style={{ position: "relative", display: "inline-block", width: 160, height: 30 }}>
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
                          height: 30,
                          cursor: "pointer",
                          background: "transparent",
                          borderRadius: 6,
                          zIndex: 5,
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
                  <span className="badge bg-info">{t.freq}×</span>

                  {(historyMap[t.keyword]?.length ?? 0) === 1 && (
                    <span className="badge badge-new">Új</span>
                  )}

                  {isIncreasing(displayHistory) && (
                    <span className="badge badge-increasing">Növekvő</span>
                  )}

                  {isDecreasing(displayHistory) && (
                    <span className="badge badge-decreasing">Csökkenő</span>
                  )}

                  {isStable && (
                    <span
                      className="badge badge-stable"
                      style={{ position: "relative", zIndex: 20 }}
                      data-bs-toggle="tooltip"
                      data-bs-placement="top"
                      title="A kulcsszó legalább 5 napja jelen van, nem növekszik és nem csökken — stabil trend."
                    >
                      Stabil
                    </span>
                  )}

                  {filters.period === "custom" && (
                    <span className="badge badge-periodic">Időszakos</span>
                  )}

                  {t.keyword.match(/ország|nemzetközi|EU|világ/i) && (
                    <span className="badge badge-international">Nemzetközi</span>
                  )}

                  <SpikeBadge
                    growth={t.growth ?? null}
                    period={filters.period}
                    topic={t.keyword}
                    totalCount={t.freq}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Modal show={!!showChart} onHide={() => setShowChart(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{showChart} – Részletes trend</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {showChart ? (
            <div style={{ width: "100%", height: "400px" }}>
              <SparklineDetailed
                history={getDisplayHistory(showChart)}
                period={filters.period}
                startDate={filters.startDate}
                endDate={filters.endDate}
              />
            </div>
          ) : (
            <p className="text-muted">Betöltés folyamatban…</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowChart(null)}
            style={{ color: "#fff", fontWeight: 600 }}
          >
            Bezárás
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
