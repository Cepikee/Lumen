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

// FIX kategória színek (kiegészítve: Egészségügy, Közélet)
const CATEGORY_COLORS: Record<string, string> = {
  Sport: "#ef4444",
  Politika: "#3b82f6",
  Gazdaság: "#22c55e",
  Tech: "#f97316",
  Kultúra: "#eab308",
  Oktatás: "#a855f7",
  Egészségügy: "#6b7280",
  Közélet: "#94a3b8",
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
  data: { category: string; points: { date: string; count: number }[] }[];
  forecast?: Record<string, ForecastPoint[]>;
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

    // 1) HISTORY – minden kategória külön dataset (pontok nélkül)
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
        // látható a legendában
        hiddenInLegend: false,
      });
    });

    // 2) FORECAST – minden kategóriahoz külön dataset, de rejtve a legendában
    if (range === "24h") {
      Object.entries(forecast as Record<string, ForecastPoint[]>).forEach(
        ([catName, fc]) => {
          const color = getCategoryColor(catName);

          datasets.push({
            label: "AI előrejelzés",
            data: fc.map((p: ForecastPoint) => ({
              // +1 óra offset a megjelenítéshez
              x: new Date(new Date(p.date).getTime() + 60 * 60 * 1000),
              y: p.predicted,
            })),
            borderColor: color,
            borderDash: [6, 6],
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            fill: false,
            // rejtve a legendában, de látható a tooltipben
            hiddenInLegend: true,
            _aiCategory: catName,
          });
        }
      );

      // 3) DUMMY LEGEND ITEM – csak ez jelenik meg az AI előrejelzésként a legendában
      datasets.push({
        label: "AI előrejelzés",
        data: [], // nincs vonal
        borderColor: "#888",
        borderDash: [6, 6],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        hiddenInLegend: false,
        _isDummyAiLegend: true,
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
          // védett ellenőrzés: ha chart.data.datasets még nincs, engedjük tovább (ne dobjon hibát)
          filter: (item: any, chart: any) => {
            const datasets = chart?.data?.datasets;
            if (!datasets) return true;
            const ds = datasets[item.datasetIndex];
            return !ds?.hiddenInLegend;
          },
        },
        // custom onClick: a dummy AI legend gombja vezérli az összes forecast datasetet
        onClick: (e: any, legendItem: any, legend: any) => {
          const chart = legend.chart;
          const idx = legendItem.datasetIndex;
          const clickedDs = chart.data.datasets[idx];

          if (clickedDs && clickedDs._isDummyAiLegend) {
            // ha legalább egy forecast látható, akkor elrejtjük mindet; különben megmutatjuk mindet
            const anyVisible = chart.data.datasets.some((d: any, i: number) => {
              return d.hiddenInLegend && chart.isDatasetVisible(i);
            });

            chart.data.datasets.forEach((d: any, i: number) => {
              if (d.hiddenInLegend) {
                chart.setDatasetVisibility(i, !anyVisible);
              }
            });

            chart.update();
            return;
          }

          // egyéb legend elemek alapértelmezett viselkedése (kategóriák)
          const ci = chart;
          const meta = ci.getDatasetMeta(idx);
          const currentlyVisible = ci.isDatasetVisible(idx);
          ci.setDatasetVisibility(idx, !currentlyVisible);
          ci.update();
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
          // magyar, 24 órás formátum: pl. "2026.02.04. 15:00:00"
          title: (items: any) => {
            const d = new Date(items[0].parsed.x);
            // explicit magyar formátum, 24h
            const parts = d.toLocaleString("hu-HU", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            return parts;
          },
          // AI tooltip formátum: "AI előrejelzés : Kategória : DB"
          label: (ctx: any) => {
            const ds = ctx.dataset;
            const value = ctx.parsed.y;
            if (ds && ds.hiddenInLegend) {
              const cat = ds._aiCategory ?? "ismeretlen";
              return `AI előrejelzés : ${cat} : ${value}`;
            }
            return `${ds.label}: ${value}`;
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
