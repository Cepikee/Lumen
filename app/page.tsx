"use client";

import { useEffect, useState } from "react";
import TrendsSection from "@/components/TrendsSection";
import FeedList from "@/components/FeedList";

interface FeedItem {
  id: number;
  url: string;
  content?: string;
  detailed_content?: string;
  ai_clean?: number | string;
  created_at?: string;
}

export default function Page() {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<FeedItem[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [showTrendsPanel, setShowTrendsPanel] = useState(true);
  const [trendExpanded, setTrendExpanded] = useState<string | null>(null);

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
      await loadHistory();
      dispatchEvent(new CustomEvent("lumen:update"));
    } catch {
      setSummary("Hiba történt az elemzés közben.");
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    try {
      const res = await fetch("/api/summaries", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    }
  }

  useEffect(() => {
    loadHistory();
    const handleUpdate = () => loadHistory();
    window.addEventListener("lumen:update", handleUpdate);
    return () => window.removeEventListener("lumen:update", handleUpdate);
  }, []);

  return (
    <main className="flex-grow-1 overflow-auto p-3">
      {/* Minimal input bar inline to avoid extra props churn */}
      <InputInline onAnalyze={handleAnalyze} loading={loading} />

      {summary && (
        <div className="card bg-secondary text-light shadow mb-4">
          <div className="card-body">
            <h5 className="card-title">📝 Összefoglaló</h5>
            <div>{summary}</div>
          </div>
        </div>
      )}

      <TrendsSection
        show={showTrendsPanel}
        onToggle={() => setShowTrendsPanel((v) => !v)}
        trendExpanded={trendExpanded}
        setTrendExpanded={setTrendExpanded}
      />

      <FeedList items={history} expandedId={expandedId} setExpandedId={setExpandedId} />
    </main>
  );
}

/* Inline minimal input to avoid the earlier URL local-state mismatch */
function InputInline({
  onAnalyze,
  loading,
}: {
  onAnalyze: (url: string) => void | Promise<void>;
  loading: boolean;
}) {
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
