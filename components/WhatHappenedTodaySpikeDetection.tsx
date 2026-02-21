"use client";

import { useEffect, useState } from "react";
import Spinner from "react-bootstrap/Spinner";

interface SpikeItem {
  type: "category" | "keyword" | "source";
  label: string;
  hour?: number;
  value: number;
  level: "mild" | "strong" | "brutal";
}

interface ApiResponse {
  success: boolean;
  spikes: SpikeItem[];
}

export default function WhatHappenedTodaySpikeDetection() {
  const [data, setData] = useState<SpikeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/insights/spike-detection");
        const json: ApiResponse = await res.json();
        if (json.success) {
          setData(json.spikes);
        }
      } catch (err) {
        console.error("Spike detection fetch error:", err);
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
    return <div className="text-muted">Ma nem történt kiugró aktivitás.</div>;
  }

  const getIcon = (type: SpikeItem["type"]) => {
    if (type === "category") return "🔥";
    if (type === "keyword") return "📈";
    return "⚡";
  };

  const getLevelText = (level: SpikeItem["level"]) => {
    if (level === "brutal") return "brutál spike";
    if (level === "strong") return "erős spike";
    return "enyhe spike";
  };

  return (
    <div className="wht-spike-detection">
      <h5 className="mb-3">Kiugró aktivitások ma</h5>

      <div className="list-group">
        {data.map((item, idx) => (
          <div
            key={idx}
            className={`list-group-item wht-spike-item wht-spike-${item.level}`}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="me-2">{getIcon(item.type)}</span>
                <strong>{item.label}</strong>

                <div className="text-muted small mt-1">
                  {item.type !== "keyword" && item.hour !== undefined && (
                    <>
                      {item.hour}:00-kor{" "}
                    </>
                  )}
                  {item.value} {item.type === "keyword" ? "előfordulás" : "cikk"} —{" "}
                  {getLevelText(item.level)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
