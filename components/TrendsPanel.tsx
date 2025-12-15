"use client";
import { useEffect, useState } from "react";
import SparklineMini from "@/components/SparklineMini";
import type { Filters } from "./TrendsFilters"; // 🔹 most már exportált interface

export interface Trend {
  keyword: string;
  frequency: number;
  category?: string; // 🔹 hozzáadva
  history?: { day: string; freq: number }[];
}

export default function TrendsPanel({ filters }: { filters: Filters }) {
  const [trends, setTrends] = useState<Trend[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/trends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(filters), // 🔹 átadjuk a szűrőket
          cache: "no-store"
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (mounted) setTrends(Array.isArray(data.trends) ? data.trends : []);
      } catch {
        if (mounted) setTrends([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [filters]); // 🔹 újra lefut, ha változik a szűrő

  if (trends.length === 0) return <p className="mb-4">Nincs még trend adat.</p>;

  return (
    <ul className="list-group mb-4">
      {trends.map((t) => (
        <li key={t.keyword} className="list-group-item">
          <div className="row align-items-center" style={{ minHeight: "72px" }}>
            <div className="col-4 d-flex align-items-center">
  <span className="fw-semibold">{t.keyword}</span>
  <span className="badge bg-info ms-2">{t.frequency}×</span>
  {t.category && (
    <span className="badge bg-secondary ms-2">{t.category}</span>
  )}
</div>


            <div className="col-5 d-flex justify-content-center">
              {t.history && (
                <div
                  className="trend-sparkline"
                  style={{
                    width: "220px",
                    height: "60px",
                    minWidth: "220px",
                    minHeight: "60px",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <SparklineMini history={t.history} period={filters.period} />
                </div>
              )}
            </div>

            <div className="col-3" />
          </div>
        </li>
      ))}
    </ul>
  );
}
