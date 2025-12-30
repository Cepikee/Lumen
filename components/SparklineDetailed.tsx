// components/SparklineDetailed.tsx
"use client";
import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip
} from "chart.js";
import type { ChartOptions, ScriptableLineSegmentContext } from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip);

type HistoryPoint = { day?: string; hour?: number; freq: number };

interface Props {
  history: HistoryPoint[];
  period: string;
  startDate?: string;
  endDate?: string;
}

export default function SparklineDetailed({ history, period, startDate, endDate }: Props) {
  const [localPeriod, setLocalPeriod] = useState(period);
  const [localStart, setLocalStart] = useState(startDate || "");
  const [localEnd, setLocalEnd] = useState(endDate || "");

  useEffect(() => {
    setLocalPeriod(period);
    setLocalStart(startDate || "");
    setLocalEnd(endDate || "");
  }, [period, startDate, endDate]);

  const lastDate =
    history.length > 0 && history[history.length - 1].day
      ? new Date(history[history.length - 1].day + "T23:59:59")
      : new Date();

  const filtered =
    localPeriod === "24h"
      ? history
      : filterByPeriod(history, localPeriod, lastDate);

  const safeFiltered =
    filtered.length === 1
      ? [
          filtered[0],
          localPeriod === "24h"
            ? { hour: filtered[0].hour, freq: filtered[0].freq }
            : { day: filtered[0].day, freq: filtered[0].freq }
        ]
      : filtered;

  const labels =
    localPeriod === "24h"
      ? safeFiltered.map(h =>
          typeof h.hour === "number"
            ? `${String(h.hour).padStart(2, "0")}:00`
            : "?"
        )
      : safeFiltered.map(h =>
          h.day
            ? new Date(h.day + "T00:00:00").toLocaleDateString("hu-HU")
            : "?"
        );

  const dataPoints = safeFiltered.map(h => h.freq);

  const pointColors = dataPoints.map((val, i) => {
    if (i === 0) return "#999";
    if (val > dataPoints[i - 1]) return "#22c55e";
    if (val < dataPoints[i - 1]) return "#ef4444";
    return "#f59e0b";
  });

  const data = {
    labels,
    datasets: [
      {
        data: dataPoints,
        pointBackgroundColor: pointColors,
        pointBorderColor: "#222",
        pointBorderWidth: 0.5,
        fill: false,
        tension: 0.25,
        segment: {
          borderColor: (ctx: ScriptableLineSegmentContext) => {
            const i = ctx.p0DataIndex;
            const curr = dataPoints[i];
            const next = dataPoints[i + 1];
            if (next > curr) return "#22c55e";
            if (next < curr) return "#ef4444";
            return "#f59e0b";
          },
          borderWidth: 2
        }
      }
    ]
  };

  const options: ChartOptions<"line"> = {
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function (context) {
            const label = String(context.label);
            const value = (context.parsed as { y: number }).y;
            return `${label} — ${value}×`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        ticks: { color: "#888", maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
        title: {
          display: true,
          text: localPeriod === "24h" ? "Óra" : "Dátum",
          color: "#777",
          font: { size: 11 }
        },
        grid: { display: false }
      },
      y: {
        display: true,
        ticks: { color: "#888", stepSize: 1, precision: 0 },
        title: { display: true, text: "Előfordulás (db)", color: "#777", font: { size: 11 } },
        grid: { color: "rgba(0,0,0,0.06)" }
      }
    },
    elements: {
      point: { radius: 3, hoverRadius: 6, hoverBackgroundColor: "#000" }
    },
    animation: { duration: 600, easing: "easeOutQuad" },
    responsive: true,
    maintainAspectRatio: false
  };

  const total = dataPoints.reduce((a, b) => a + b, 0);
  const average =
    localPeriod === "24h"
      ? (total / 24).toFixed(2)
      : (total / Math.max(1, dataPoints.length)).toFixed(2);

  return (
    <div className="d-flex flex-column gap-3 p-2">
      <div className="d-flex flex-column align-items-end gap-2">
        <div className="d-flex align-items-center">
          <label className="small text-secondary me-2">Időszak:</label>
          <select
            className="form-select form-select-sm w-auto"
            value={localPeriod}
            onChange={(e) => setLocalPeriod(e.target.value)}
          >
            <option value="24h">24 óra</option>
            <option value="3d">3 nap</option>
            <option value="7d">7 nap</option>
            <option value="30d">30 nap</option>
            <option value="365d">365 nap</option>
            <option value="all">Teljes időszak</option>
            <option value="custom">Egyedi</option>
          </select>
        </div>

        {localPeriod === "custom" && (
          <div className="d-flex align-items-center gap-2">
            <input
              type="date"
              className="form-control form-control-sm w-auto"
              value={localStart}
              onChange={(e) => setLocalStart(e.target.value)}
            />
            <span>–</span>
            <input
              type="date"
              className="form-control form-control-sm w-auto"
              value={localEnd}
              onChange={(e) => setLocalEnd(e.target.value)}
            />
          </div>
        )}
      </div>

      <div style={{ width: "100%", height: "260px" }}>
        {safeFiltered.length > 0 ? (
          <Line data={data} options={options} />
        ) : (
          <p className="text-muted text-center mt-4">Nincs adat az adott időszakban.</p>
        )}
      </div>

      {safeFiltered.length > 0 && (
        <div className="d-flex justify-content-between flex-wrap gap-2 small text-secondary">
          <div className="d-flex align-items-center gap-3">
            <span style={{ color: "#22c55e" }}>● Emelkedés</span>
            <span style={{ color: "#ef4444" }}>● Csökkenés</span>
            <span style={{ color: "#f59e0b" }}>● Változatlan</span>
          </div>

          <div>
            Összes: {total} db • Átlag: {average} {localPeriod === "24h" ? "db/óra" : "db/nap"}
          </div>
        </div>
      )}
    </div>
  );
}

function filterByPeriod(history: HistoryPoint[], period: string, lastDate: Date) {
  if (period === "24h") return history;

  let days = 0;
  if (period === "3d") days = 3;
  else if (period === "7d") days = 7;
  else if (period === "30d") days = 30;
  else if (period === "365d") days = 365;
  else if (period === "all") return history;
  else return history;

  const from = new Date(lastDate.getTime() - days * 24 * 60 * 60 * 1000);

  const map = new Map(history.map(h => [h.day!, h.freq]));

  const result: HistoryPoint[] = [];
  const cursor = new Date(from);

  while (cursor <= lastDate) {
    const key = cursor.toISOString().slice(0, 10);

    result.push({
      day: key,
      freq: map.get(key) ?? 0
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}
