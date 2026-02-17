// components/InsightsOverviewChart.tsx

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
import { useUserStore } from "@/store/useUserStore";

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

const CATEGORY_COLORS: Record<string, string> = {
  Sport: "#ef4444",
  Politika: "#3b82f6",
  Gazdaság: "#00ff5e",
  Tech: "#f97316",
  Kultúra: "#eab308",
  Oktatás: "#a855f7",
  Egészségügy: "#e600ee",
  Közélet: "#578f68",
  _default: "#6b7280",
};

function getCategoryColor(c: string) {
  return CATEGORY_COLORS[c] ?? CATEGORY_COLORS._default;
}

export default function InsightsOverviewChart({
  data,
  forecast = {},
  height = 300,
  range = "24h",
}: any) {
    console.log("CHART RAW DATA:", data);
  const theme = useUserStore((s) => s.theme);
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const textColor = isDark ? "#ddd" : "#333";

  const gridColor = isDark
    ? "rgba(255,255,255,0.15)"
    : "rgba(0,0,0,0.12)";

  const { datasets } = useMemo(() => {
    const ds: any[] = [];

    // HISTORY
    (data || []).forEach((cat: any) => {
      const label = cat?.category ?? "Ismeretlen";
      const color = getCategoryColor(label);
      const points = Array.isArray(cat?.points) ? cat.points : [];
      ds.push({
        label,
        data: points
          .map((p: any) => {
            const dateVal = p?.date ? new Date(p.date) : null;
            const countVal =
              typeof p?.count === "number"
                ? p.count
                : Number(p?.count) || 0;
            return dateVal ? { x: dateVal, y: countVal } : null;
          })
          .filter(Boolean),
        borderColor: color,
        backgroundColor: color + "22",
        showLine: true,
        stepped: false,
        cubicInterpolationMode: "monotone",   // ⭐ EZ A LÉNYEG
        tension: 0.15,                          // ⭐ SZÉP, LÁGY GÖRBE
        pointRadius: 0,
        pointHoverRadius: 6,
        borderWidth: 1.2,
        fill: false,
      });



    });

    // AI FORECAST – csak 24h
    if (range === "24h" && forecast && typeof forecast === "object") {
      const VALID_CATEGORIES = Object.keys(CATEGORY_COLORS).filter(k => k !== "_default");
      Object.entries(forecast).forEach(([catName, fc]: any) => {
        if (!VALID_CATEGORIES.includes(catName)) return; // ⭐ SZŰRÉS
        const series = Array.isArray(fc) ? fc : [];
        const color = getCategoryColor(catName);
        ds.push({
          label: "AI előrejelzés",
          data: series
            .map((p: any) => {
              const date = p?.date ? new Date(p.date) : null;
              const pred =
                typeof p?.predicted === "number"
                  ? p.predicted
                  : Number(p?.predicted) || 0;
              return date ? { x: date, y: pred } : null;
            })
            .filter(Boolean),

          borderColor: color,
          borderDash: [6, 6],       // ⭐ szaggatott vonal
          borderWidth: 1.2,

          // ⭐ UGYANAZ, mint a history
          cubicInterpolationMode: "monotone",
          tension: 0.15,
          pointRadius: 0,
          pointHoverRadius: 6,
          fill: false,
          spanGaps: true,           // ⭐ fontos!

          _isForecast: true,
          _aiCategory: catName,
        });

      });

      // dummy AI legend
      ds.push({
        label: "AI előrejelzés",
        data: [],
        borderColor: "#999",
        borderDash: [6, 6],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        _isDummyAiLegend: true,
        _isForecast: true,
      });
    }

    return { datasets: ds };
  }, [data, forecast, range, theme]);

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
        beginAtZero: true,
        suggestedMax: 5,
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: textColor,
          generateLabels: (chart: any) => {
            const original =
              ChartJS.defaults.plugins.legend.labels.generateLabels(chart);

            return original.filter((item: any) => {
              const ds = chart.data.datasets[item.datasetIndex];
              if (!ds) return false;
              const lbl = (ds.label || "").toString().toLowerCase();
              if (lbl === "hír" || lbl === "hir" || lbl === "news") return false;
              if (!ds._isForecast) return true;
              if (range === "24h" && ds._isDummyAiLegend) return true;
              return false;
            });
          },
        },
        onClick: (e: any, item: any, legend: any) => {
          const chart = legend.chart;
          const idx = item.datasetIndex;
          const ds = chart.data.datasets[idx];

          if (range !== "24h") {
            const visible = chart.isDatasetVisible(idx);
            chart.setDatasetVisibility(idx, !visible);
            chart.update();
            return;
          }

          if (ds._isDummyAiLegend) {
            const anyVisible = chart.data.datasets.some(
              (d: any, i: number) =>
                d._isForecast &&
                !d._isDummyAiLegend &&
                chart.isDatasetVisible(i)
            );

            chart.data.datasets.forEach((d: any, i: number) => {
              if (d._isForecast && !d._isDummyAiLegend) {
                chart.setDatasetVisibility(i, !anyVisible);
              }
            });

            chart.update();
            return;
          }

          const visible = chart.isDatasetVisible(idx);
          chart.setDatasetVisibility(idx, !visible);
          chart.update();
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
              second: "2-digit",
            });
          },
          label: (ctx: any) => {
            const ds = ctx.dataset;
            const v = ctx.parsed.y;
            if (ds._isForecast) {
              return `AI előrejelzés · ${ds._aiCategory}: ${v}`;
            }
            return `${ds.label}: ${v}`;
          },
        },
      },
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: "x",
        },
        pan: { enabled: true, mode: "x" },
      },
      decimation: { enabled: false}
    },
  };

  return (
    <div style={{ width: "100%", height }}>
      <Line key={range + theme} data={{ datasets }} options={options} />
    </div>
  );
}
