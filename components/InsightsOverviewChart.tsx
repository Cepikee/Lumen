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

// CROSSHAIR
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

type ForecastPoint = {
  date: string;
  predicted: number;
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

// FIX kategória színek
const CATEGORY_COLORS: Record<string, string> = {
  Sport: "#ef4444",
  Politika: "#3b82f6",
  Gazdaság: "#22c55e",
  Tech: "#f97316",
  Kultúra: "#eab308",
  Oktatás: "#a855f7",
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
  data: any[];
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
    const datasets: any[] = [];

    // 1) HISTORY – kategóriánként külön dataset
    data.forEach((cat) => {
      const color = getCategoryColor(cat.category);

      datasets.push({
        label: cat.category,
        data: cat.points.map((p: any) => ({
          x: new Date(p.date),
          y: p.count,
        })),
        borderColor: color,
        backgroundColor: color + "33",
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.3,
        fill: false,
        hiddenInLegend: false,
      });
    });

    // 2) FORECAST – kategóriánként külön dataset, de legendben rejtve
    if (range === "24h") {
      Object.entries(forecast as Record<string, ForecastPoint[]>).forEach(
        ([catName, fc]) => {
          const color = getCategoryColor(catName);

          datasets.push({
            label: "AI előrejelzés",
            data: fc.map((p: ForecastPoint) => ({
              x: new Date(new Date(p.date).getTime() + 60 * 60 * 1000), // +1 óra offset
              y: p.predicted,
            })),
            borderColor: color,
            borderDash: [6, 6],
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            fill: false,
            hiddenInLegend: true,
          });
        }
      );

      // 3) DUMMY LEGEND ITEM – csak a legendben látszik
      datasets.push({
        label: "AI előrejelzés",
        data: [],
        borderColor: "#888",
        borderDash: [6, 6],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        hiddenInLegend: false, // EZ LÁTSZIK A LEGENDBEN
      });
    }

    return { datasets };
  }, [data, forecast, range]);

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: false },
    scales: {
      x: {
        type: "time",
        adapters: { date: { locale: hu } },
        time: { unit: "hour", displayFormats: { hour: "HH:mm" } },
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
          // VÉDŐ ellenőrzés: ha chart.data.datasets még nincs, engedjük tovább (ne dobjon hibát)
          filter: (item: any, chart: any) => {
            const datasets = chart?.data?.datasets;
            if (!datasets) {
              // Chart még épül — ne okozzunk hibát, engedjük, hogy a legend megjelenjen később
              return true;
            }
            const ds = datasets[item.datasetIndex];
            return !ds?.hiddenInLegend;
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const ds = ctx.dataset;
            if (ds?.hiddenInLegend) {
              // forecast dataset (rejtett legendában) — mutassuk a kategória nevét a tooltipben
              return `AI előrejelzés – ${ds.borderColor || ds._aiCategory || "?"}: ${ctx.parsed.y}`;
            }
            return `${ds.label}: ${ctx.parsed.y}`;
          },
        },
      },
    },
  };

  return (
    <div style={{ width: "100%", height }}>
      <Line data={{ datasets }} options={options} />
    </div>
  );
}
