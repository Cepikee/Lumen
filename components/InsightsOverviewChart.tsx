"use client";

import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import "chartjs-adapter-date-fns";
import { hu } from "date-fns/locale";
import { Line } from "react-chartjs-2";
import { useMemo } from "react";

// ─────────────────────────────────────────────
// CROSSHAIR
// ─────────────────────────────────────────────
const crosshairPlugin = {
  id: "crosshair",
  afterDatasetsDraw(chart: any) {
    const active = chart.tooltip?.getActiveElements?.();
    if (!active || active.length === 0) return;

    const ctx = chart.ctx;
    const { x } = active[0].element;
    const topY = chart.chartArea.top;
    const bottomY = chart.chartArea.bottom;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x, bottomY);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#8884";
    ctx.stroke();
    ctx.restore();
  },
};

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin,
  crosshairPlugin
);

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type Point = { date: string; count: number };
type CategorySeries = { category: string; points: Point[] };

export default function InsightsOverviewChart({
  data,
  forecast = {},
  height = 300,
  range = "24h",
}: {
  data: CategorySeries[];
  forecast?: any;
  height?: number;
  range?: "24h" | "7d" | "30d" | "90d";
}) {
  const isDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const textColor = isDark ? "#ddd" : "#333";
  const gridColor = isDark ? "#444" : "#eee";

  // ─────────────────────────────────────────────
  // FIX KATEGÓRIA SZÍNEK
  // ─────────────────────────────────────────────
  const palette = [
    "#ff6b6b",
    "#4dabf7",
    "#ffd166",
    "#06d6a0",
    "#9b5de5",
    "#f06595",
    "#00c2d1",
    "#ff922b",
  ];

  const getColor = (category: string, idx: number) =>
    palette[idx % palette.length];

  // MOST UTC
  const nowLocal = new Date();
  const nowUtc = new Date(nowLocal.getTime() - nowLocal.getTimezoneOffset() * 60000);

  // ─────────────────────────────────────────────
  // DATASETS
  // ─────────────────────────────────────────────
  const { datasets } = useMemo(() => {
    if (!data || data.length === 0) return { datasets: [] };

    const datasets: any[] = [];

    // 1) HISTORY – kategóriánként külön dataset
    data.forEach((cat, idx) => {
      const color = getColor(cat.category, idx);

      datasets.push({
        label: `${cat.category}`,
        data: cat.points.map((p) => ({
          x: new Date(p.date),
          y: p.count,
        })),
        borderColor: color,
        backgroundColor: color + "33",
        pointBackgroundColor: color,
        pointBorderColor: color,
        pointRadius: 3,
        borderWidth: 2,
        tension: 0.3,
        fill: false,
      });
    });

    // 2) FORECAST – kategóriánként külön dataset
    if (range === "24h") {
      Object.entries(forecast || {}).forEach(([catName, fc], idx) => {
        const color = getColor(catName, idx);

        const points = (fc as any[])
          .map((p) => ({
            x: new Date(p.date),
            y: p.predicted,
          }))
          .filter((p) => p.x.getTime() >= nowUtc.getTime());

        if (points.length > 0) {
          datasets.push({
            label: `${catName} – AI előrejelzés`,
            data: points,
            borderColor: color,
            borderDash: [6, 6],
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: color,
            pointBorderColor: color,
            fill: false,
          });
        }
      });
    }

    return { datasets };
  }, [data, forecast, range]);

  if (!datasets || datasets.length === 0) return null;

  // ─────────────────────────────────────────────
  // OPTIONS
  // ─────────────────────────────────────────────
  const options: any = {
    responsive: true,
    maintainAspectRatio: false,

    interaction: {
      mode: "nearest",
      intersect: false,
    },

    animation: { duration: 300, easing: "easeOutQuart" },

    scales: {
      x: {
        type: "time",
        adapters: { date: { locale: hu } },
        time: {
          unit: "hour",
          displayFormats: { hour: "HH:mm" },
        },
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
      y: {
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
    },

    plugins: {
      legend: { labels: { color: textColor } },

      tooltip: {
        enabled: true,
        backgroundColor: isDark ? "#222" : "#fff",
        titleColor: isDark ? "#fff" : "#000",
        bodyColor: isDark ? "#ddd" : "#333",
        borderColor: isDark ? "#444" : "#ccc",
        borderWidth: 1,

        callbacks: {
          title: (items: any) => {
            const d = new Date(items[0].parsed.x);
            return d.toLocaleString("hu-HU", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
          },
          label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y}`,
        },
      },

      zoom: {
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
        pan: { enabled: true, mode: "x" },
      },
    },
  };

  return (
    <div style={{ width: "100%", height }}>
      <Line data={{ datasets }} options={options} />
    </div>
  );
}
