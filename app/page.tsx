"use client";
import React from "react";
import { useEffect, useState, useRef } from "react";
import FeedList from "@/components/FeedList";
import { FeedItem } from "@/types/FeedItem";

export default function Page() {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Forrás szűrő
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const [sourceFilters, setSourceFilters] = useState<string[]>([]);

  // Nézetváltó
  const [viewMode, setViewMode] = useState<"card" | "compact">("card");

  // Today mód
  const [isTodayMode, setIsTodayMode] = useState(false);

  const loaderRef = useRef<HTMLDivElement | null>(null);

  // --- Nézet betöltése localStorage-ből --- //
  useEffect(() => {
    const saved = localStorage.getItem("viewMode");
    if (saved === "card" || saved === "compact") {
      setViewMode(saved);
    }
  }, []);

  // --- Forrás szűrés --- //
  async function applySourceFilter(sources: string[]) {
    setSourceFilters(sources);
    setItems([]);
    setPage(1);

    // Ha nincs kiválasztva semmi → összes hír
    if (sources.length === 0) {
      setHasMore(true);
      fetchPage(1);
      return;
    }

    setLoading(true);
    setHasMore(false); // szűrésnél nincs infinite scroll

    try {
      const query = sources
        .map((s) => `source=${encodeURIComponent(s)}`)
        .join("&");

      const res = await fetch(`/api/summaries?${query}`, {
        cache: "no-store",
      });

      const raw = await res.json();
      const data: FeedItem[] = raw.map((item: any) => ({
        ...item,
        ai_clean: Number(item.ai_clean),
      }));

      setItems(data);
    } catch (err) {
      console.error("Source filter error:", err);
    }

    setLoading(false);
  }

  // --- Oldalankénti fetch (csak ha nem today mód és nincs forrásszűrő) --- //
  async function fetchPage(pageNum: number) {
    if (loading || isTodayMode || sourceFilters.length > 0) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/summaries?page=${pageNum}&limit=20`, {
        cache: "no-store",
      });

      if (!res.ok) return;

      const raw = await res.json();

      const data: FeedItem[] = raw.map((item: any) => ({
        ...item,
        ai_clean: Number(item.ai_clean),
      }));

      if (!Array.isArray(data) || data.length === 0) {
        setHasMore(false);
      } else {
        setItems((prev) => {
          const merged = [...prev, ...data];
          const unique = merged.filter(
            (item, index, self) =>
              index === self.findIndex((x) => x.id === item.id)
          );
          return unique;
        });
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
    setLoading(false);
  }

  // --- Első oldal betöltése --- //
  useEffect(() => {
    if (!isTodayMode && sourceFilters.length === 0) {
      fetchPage(page);
    }
  }, [page, isTodayMode, sourceFilters]);

  // --- Infinite scroll observer --- //
  useEffect(() => {
    if (!loaderRef.current || isTodayMode || sourceFilters.length > 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 1 }
    );

    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, isTodayMode, sourceFilters]);

  // --- Mi történt ma? --- //
  async function handleTodayFilter() {
    setLoading(true);
    setIsTodayMode(true);
    setItems([]);
    setHasMore(false); // nincs infinite scroll ma

    try {
      const res = await fetch(`/api/summaries?today=true`, {
        cache: "no-store",
      });

      const raw = await res.json();
      const data: FeedItem[] = raw.map((item: any) => ({
        ...item,
        ai_clean: Number(item.ai_clean),
      }));

      setItems(data);
    } catch (err) {
      console.error("Today filter error:", err);
    }

    setLoading(false);
  }

  // --- Visszaállítás teljes feedre --- //
  function resetFeed() {
    setIsTodayMode(false);
    setSourceFilters([]);
    setItems([]);
    setPage(1);
    setHasMore(true);
  }

  return (
    <main className="flex-grow-1 overflow-auto p-3">

      {/* Nézet + Források + Mi történt ma? */}
      <div className="mb-3 d-flex gap-2 position-relative">

        {/* Nézetváltó */}
        <button
          className="btn btn-secondary"
          onClick={() => setShowDropdown((prev) => !prev)}
        >
          Nézet
        </button>

        {showDropdown && (
          <div
            className="dropdown-menu show"
            style={{ position: "absolute", top: "100%", left: 0 }}
          >
            <button
              className="dropdown-item"
              onClick={() => {
                setViewMode("card");
                localStorage.setItem("viewMode", "card");
                setShowDropdown(false);
              }}
            >
              Nézet: Kártya
            </button>

            <button
              className="dropdown-item"
              onClick={() => {
                setViewMode("compact");
                localStorage.setItem("viewMode", "compact");
                setShowDropdown(false);
              }}
            >
              Nézet: Kompakt
            </button>
          </div>
        )}

        {/* Mi történt ma? */}
        <button className="btn btn-secondary" onClick={handleTodayFilter}>
          🗓️ Mi történt ma?
        </button>

        {/* Visszaállítás */}
        {(isTodayMode || sourceFilters.length > 0) && (
          <button className="btn btn-outline-secondary" onClick={resetFeed}>
            🔄 Összes hír
          </button>
        )}

        {/* Források */}
        <button
          className="btn btn-secondary"
          onClick={() => setShowSourcePanel(prev => !prev)}
        >
          Források
        </button>

        {/* Forrás panel */}
        {showSourcePanel && (
          <div
            className="card p-3 shadow-sm"
            style={{
              position: "absolute",
              top: "100%",
              left: "0",
              zIndex: 10,
              width: "250px"
            }}
          >
            <h6 className="fw-bold mb-2">📰 Források</h6>

            {/* Mind */}
            <div className="form-check mb-1">
              <input
                type="checkbox"
                className="form-check-input"
                checked={sourceFilters.length === 0}
                onChange={() => {
                  setSourceFilters([]);
                  setShowSourcePanel(false);
                  applySourceFilter([]);
                }}
              />
              <label className="form-check-label">Mind</label>
            </div>

            {/* Egyes források — ID + név */}
            {[
              { id: 1, name: "Telex" },
              { id: 5, name: "Index" },
              { id: 6, name: "444" },
              { id: 4, name: "HVG" },
              { id: 2, name: "24.hu" },
              { id: 3, name: "Portfolio" },
            ].map(src => (
              <div key={src.id} className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={sourceFilters.includes(String(src.id))}
                  onChange={(e) => {
                    const newSources = e.target.checked
                      ? [...sourceFilters, String(src.id)]
                      : sourceFilters.filter(s => s !== String(src.id));

                    setSourceFilters(newSources);
                    setShowSourcePanel(false);
                    applySourceFilter(newSources);
                  }}
                />
                <label className="form-check-label">{src.name}</label>
              </div>
            ))}
          </div>
        )}

      </div>

      <FeedList
        items={items}
        expandedId={expandedId}
        setExpandedId={setExpandedId}
        viewMode={viewMode}
      />

      {/* Sentinel elem az infinite scrollhoz */}
      {!isTodayMode && sourceFilters.length === 0 && (
        <div ref={loaderRef} style={{ height: "50px" }} />
      )}

      {loading && <p className="text-center text-muted mt-3">Betöltés...</p>}
      {!hasMore && !isTodayMode && sourceFilters.length === 0 && (
        <p className="text-center text-muted mt-3">Nincs több hír.</p>
      )}
    </main>
  );
}
