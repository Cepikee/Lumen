"use client";

import useSWR from "swr";
import Spinner from "react-bootstrap/Spinner";

type SpikeLevel = "mild" | "strong" | "brutal";

interface SpikeItem {
  label: string;
  hour: number;
  value: number;
  level: SpikeLevel;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function WhatHappenedTodaySpikeDetection() {
  const { data, error, isLoading } = useSWR<{ success: boolean; spikes: SpikeItem[] }>(
    "/api/insights/spike-detection",
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: true }
  );

  if (isLoading) {
    return (
      <div className="spike-list-root text-center">
        <Spinner animation="border" size="sm" /> Betöltés...
      </div>
    );
  }

  if (error || !data || !data.success) {
    return (
      <div className="spike-list-root text-danger">
        Nem sikerült betölteni az aktivitásokat.
      </div>
    );
  }

  const spikes = Array.isArray(data.spikes) ? data.spikes : [];
  if (!spikes.length) {
    return (
      <div className="spike-list-root text-muted">
        Ma nem történt kiugró aktivitás.
      </div>
    );
  }

  const sorted = [...spikes].sort((a, b) => b.value - a.value);
  const maxVal = Math.max(...sorted.map((s) => s.value), 1);

  const levelLabel = (l: SpikeLevel) =>
    l === "brutal" ? "Brutál" : l === "strong" ? "Erős" : "Enyhe";

  return (
    <div className="spike-list-root">
      <h5 className="spike-list-title">Kiugró aktivitások ma</h5>

      <ul className="spike-list">
        {sorted.map((s, i) => {
          const width = (s.value / maxVal) * 100;

          return (
            <li key={i} className="spike-row">
              <div className="spike-row-main">
                <span className="spike-label">{s.label}</span>
                <span className="spike-time">{s.hour}:00</span>
                <span className="spike-value">{s.value}</span>
              </div>

              <div className="spike-bar">
                <div
                  className={`spike-bar-fill spike-bar-${s.level}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
