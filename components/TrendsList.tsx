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

export default function TrendsList({ filters, trends: externalTrends }: Props) {
  const [trends, setTrends] = useState<Trend[]>(externalTrends ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [historyMap, setHistoryMap] = useState<Record<string, HistoryRow[]>>({});
  const [showChart, setShowChart] = useState<string | null>(null);

  useEffect(() => {
    if (Array.isArray(externalTrends)) {
      setTrends(externalTrends);
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
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        const trendList = Array.isArray(data.trends) ? data.trends : Array.isArray(data) ? data : [];
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
            .then((res) => res.json())
            .then((data) => {
              if (!mounted) return;
              if (Array.isArray(data.history)) {
                setHistoryMap((prev) => ({ ...prev, [t.keyword]: data.history as HistoryRow[] }));
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
  }, [filters, externalTrends]);

  useEffect(() => {
    if (Array.isArray(externalTrends)) setTrends(externalTrends);
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
    const from = new Date(filters.startDate + "T00:00:00");
    const to = new Date(filters.endDate + "T23:59:59");
    return history.filter((h) => {
      if (!h.day) return false;
      const d = new Date(h.day + "T00:00:00");
      return d >= from && d <= to;
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
      (t.category ? filters.categories.includes(t.category.toLowerCase()) : true);

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
