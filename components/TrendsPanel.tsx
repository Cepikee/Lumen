"use client";
import { useEffect, useState } from "react";
import SparklineMini from "@/components/SparklineMini";

export interface Trend {
  keyword: string;
  freq: number;
  history?: { day: string; freq: number }[];
}

export default function TrendsPanel() {
  const [trends, setTrends] = useState<Trend[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/trends", { cache: "no-store" });
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
  }, []);

  if (trends.length === 0) return <p className="mb-4">Nincs még trend adat.</p>;

  return (
    <ul className="list-group mb-4">
      {trends.map((t) => (
        <li key={t.keyword} className="list-group-item">
          <div className="row align-items-center" style={{ minHeight: "72px" }}>
            {/* Bal oldal: kulcsszó + badge */}
            <div className="col-4 d-flex align-items-center">
              <span className="fw-semibold">{t.keyword}</span>
              <span className="badge bg-info ms-2">{t.freq}×</span>
            </div>

            {/* Közép: SparklineMini grafikon */}
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
                  <SparklineMini history={t.history} period="365d" />
                </div>
              )}
            </div>

            {/* Jobb oldal: üres hely (Cikkek eltávolítva) */}
            <div className="col-3" />
          </div>
        </li>
      ))}
    </ul>
  );
}
