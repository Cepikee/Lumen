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

  // Nézetváltó
  const [viewMode, setViewMode] = useState<"card" | "compact">("card");

  const loaderRef = useRef<HTMLDivElement | null>(null);

  // --- Nézet betöltése localStorage-ből --- //
  useEffect(() => {
    const saved = localStorage.getItem("viewMode");
    if (saved === "card" || saved === "compact") {
      setViewMode(saved);
    }
  }, []);

  // --- Oldalankénti fetch --- //
  async function fetchPage(pageNum: number) {
    if (loading) return;

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
        // DUPLIKÁLT ID-k kiszűrése
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
    fetchPage(page);
  }, [page]);

  // --- Infinite scroll observer --- //
  useEffect(() => {
    if (!loaderRef.current) return;

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
  }, [hasMore, loading]);

  // --- Elemzés után reset + újratöltés --- //
  async function handleAnalyze(url: string) {
    setLoading(true);
    setSummary(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      setSummary(data.summary);

      // Reset feed
      setItems([]);
      setPage(1);
      setHasMore(true);
    } catch {
      setSummary("Hiba történt az elemzés közben.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-grow-1 overflow-auto p-3">

      {/* Nézetváltó (React dropdown) */}
      <div className="mb-3 position-relative">
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
      </div>

      <InputInline onAnalyze={handleAnalyze} loading={loading} />

      {summary && (
        <div className="card bg-secondary text-light shadow mb-4">
          <div className="card-body">
            <h5 className="card-title">📝 Összefoglaló</h5>
            <div>{summary}</div>
          </div>
        </div>
      )}

      <FeedList
        items={items}
        expandedId={expandedId}
        setExpandedId={setExpandedId}
        viewMode={viewMode}
      />

      {/* Sentinel elem az infinite scrollhoz */}
      <div ref={loaderRef} style={{ height: "50px" }} />

      {loading && <p className="text-center text-muted mt-3">Betöltés...</p>}
      {!hasMore && <p className="text-center text-muted mt-3">Nincs több hír.</p>}
    </main>
  );
}

// --- InputInline --- //
function InputInline({
  onAnalyze,
  loading,
}: {
  onAnalyze: (url: string) => void | Promise<void>;
  loading: boolean;
}): React.ReactElement {
  const [url, setUrl] = useState("");

  return (
    <div className="input-group mb-3">
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Írd be a cikk URL-jét..."
        className="form-control"
      />
      <button
        onClick={() => onAnalyze(url)}
        disabled={loading || !url}
        className="btn btn-primary"
      >
        {loading ? "Elemzés folyamatban..." : "Elemzés"}
      </button>
    </div>
  );
}
