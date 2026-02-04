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

// FIX kategória színek – ALAP BEÁLLÍTÁS
const CATEGORY_COLORS: Record<string, string> = {
  Sport: "#ef4444",
  Politika: "#3b82f6",
  Gazdaság: "#22c55e",
  Tech: "#f97316",
  Kultúra: "#eab308",
  Oktatás: "#a855f7",
  // fallback
  _default: "#6b7280",
};

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS._default;
}

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

  const { datasets } = useMemo(() => {
    if (!data || data.length === 0) return { datasets: [] };

    const datasets: any[] = [];

    // HISTORY – kategóriánként külön dataset, pont nélkül
    data.forEach((cat) => {
      const color = getCategoryColor(cat.category);

      datasets.push({
        label: cat.category,
        data: cat.points.map((p) => ({
          x: new Date(p.date),
          y: p.count,
        })),
        borderColor: color,
        backgroundColor: color + "33",
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.3,
        fill: false,
        _isForecast: false,
      });
    });

    // FORECAST – kategóriánként külön dataset, de 1 legend sor (filterrel)
    if (range === "24h") {
      Object.entries(forecast || {}).forEach(([catName, fc]) => {
        const color = getCategoryColor(catName);

        const points = (fc as any[]).map((p) => ({
          x: new Date(p.date),
          y: p.predicted,
        }));

        if (points.length > 0) {
          datasets.push({
            label: "AI előrejelzés",
            data: points,
            borderColor: color,
            borderDash: [6, 6],
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            fill: false,
            _isForecast: true,
            _aiCategory: catName,
          });
        }
      });
    }

    return { datasets };
  }, [data, forecast, range]);

  if (!datasets || datasets.length === 0) return null;

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
      legend: {
        labels: {
          color: textColor,
          // csak az első AI előrejelzés dataset jelenjen meg a legendben
          filter: (item: any, chart: any) => {
            const ds: any = chart.data.datasets[item.datasetIndex];
            if (!ds?._isForecast) return true;

            const firstForecastIndex = chart.data.datasets.findIndex(
              (d: any) => d._isForecast
            );
            return item.datasetIndex === firstForecastIndex;
          },
        },
      },
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
          label: (ctx: any) => {
            const ds = ctx.dataset;
            const value = ctx.parsed.y;

            if (ds._isForecast) {
              return `AI előrejelzés – ${ds._aiCategory}: ${value}`;
            }

            return `${ds.label}: ${value}`;
          },
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
