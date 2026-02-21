"use client";

import { useEffect, useState } from "react";
import Spinner from "react-bootstrap/Spinner";

interface HeatmapResponse {
  success: boolean;
  categories: string[];
  hours: number[];
  matrix: Record<string, Record<number, number>>;
}

export default function WhatHappenedTodayHeatmap() {
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/insights/heatmap");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Heatmap fetch error:", err);
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

  if (!data || !data.success) {
    return <div className="text-danger">Nem sikerült betölteni a heatmap adatokat.</div>;
  }

  const { categories, hours, matrix } = data;

  return (
    <div className="wht-heatmap">
      <h5 className="mb-3">Kategóriák aktivitása óránként</h5>

      <div className="table-responsive">
        <table className="table table-bordered wht-heatmap-table">
          <thead>
            <tr>
              <th>Kategória</th>
              {hours.map((h) => (
                <th key={h} className="text-center">{h}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {categories.map((cat) => (
              <tr key={cat}>
                <td className="fw-semibold">{cat}</td>

                {hours.map((h) => {
                  const value = matrix[cat]?.[h] ?? 0;
                  return (
                    <td
                      key={h}
                      className="wht-heatmap-cell text-center"
                      data-value={value}
                    >
                      {value > 0 ? value : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
