"use client";

import { useEffect, useState } from "react";
import Spinner from "react-bootstrap/Spinner";

interface SourceItem {
  source: string;
  total: number;
  hours: number[];
}

interface ApiResponse {
  success: boolean;
  sources: SourceItem[];
}

export default function WhatHappenedTodaySourceActivity() {
  const [data, setData] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/insights/source-activity");
        const json: ApiResponse = await res.json();
        if (json.success) {
          setData(json.sources);
        }
      } catch (err) {
        console.error("Source activity fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (!data.length) {
    return <div className="text-muted">Ma még nincs aktivitás.</div>;
  }

  return (
    <div className="wht-source-activity">
      <h5 className="mb-3">Források aktivitása ma</h5>

      <div className="list-group">
        {data.map((item) => {
          const max = Math.max(...item.hours, 1); // egyszer számoljuk ki

          return (
            <div
              key={item.source}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              {/* Bal oldal */}
              <div>
                <strong>{item.source}</strong>
                <div className="text-muted small">{item.total} cikk</div>
              </div>

              {/* Jobb oldal: sparkline */}
              <div className="wht-sparkline">
                {item.hours.map((count, idx) => {
                  const height = (count / max) * 24; // max 24px

                  return (
                    <div
                      key={idx}
                      className="wht-sparkline-bar"
                      style={{ height: `${height}px` }}
                      title={`${idx}:00 — ${count} cikk`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
