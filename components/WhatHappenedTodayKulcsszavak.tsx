"use client";

import { useEffect, useState } from "react";
import Spinner from "react-bootstrap/Spinner";

interface KeywordItem {
  keyword: string;
  count: number;
  level: "mild" | "strong" | "brutal" | null;
}

interface ApiResponse {
  success: boolean;
  keywords: KeywordItem[];
}

export default function WhatHappenedTodayKulcsszavak() {
  const [data, setData] = useState<KeywordItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/insights/trending-keywords");
        const json: ApiResponse = await res.json();
        if (json.success) {
          setData(json.keywords);
        }
      } catch (err) {
        console.error("Trending keywords fetch error:", err);
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
    return <div className="text-muted">Ma még nincsenek felkapott kulcsszavak.</div>;
  }

  const getLevelText = (level: KeywordItem["level"]) => {
    if (level === "brutal") return "brutál spike";
    if (level === "strong") return "erős spike";
    if (level === "mild") return "enyhe spike";
    return "";
  };

  return (
    <div className="wht-trending-keywords">
      <h5 className="mb-3">Felkapott kulcsszavak ma</h5>

      <div className="list-group">
        {data.map((item, idx) => (
          <div
            key={idx}
            className={`list-group-item wht-keyword-item ${
              item.level ? `wht-keyword-${item.level}` : ""
            }`}
          >
            <div className="d-flex justify-content-between align-items-center">
              
              {/* Bal oldal: kulcsszó + csak a spike magyarázat */}
              <div>
                <span className="me-2">📈</span>
                <strong>{item.keyword}</strong>

                {item.level && (
                  <div className="text-muted small mt-1">
                    {getLevelText(item.level)}
                  </div>
                )}
              </div>

              {/* Jobb oldal: nagy szám + db */}
              <div className="fw-bold fs-6 text-end">
                {item.count} db
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
